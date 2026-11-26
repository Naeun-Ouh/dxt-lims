-- WP-03: additive exact clone provenance. No backfill or inference for historical revisions.
-- Apply only to approved isolated development environments until deployment approval.
BEGIN;
CREATE TABLE dxt_sample.revision_clone_origin (
 revision_id text PRIMARY KEY,
 sample_id text NOT NULL,
 copied_from_revision_id text NOT NULL,
 change_reason text CHECK (change_reason IS NULL OR length(change_reason) <= 2000),
 FOREIGN KEY(sample_id,revision_id) REFERENCES dxt_sample.revision(sample_id,id),
 FOREIGN KEY(sample_id,copied_from_revision_id) REFERENCES dxt_sample.revision(sample_id,id),
 CHECK (revision_id <> copied_from_revision_id)
);
CREATE TRIGGER clone_origin_immutable BEFORE UPDATE OR DELETE ON dxt_sample.revision_clone_origin
 FOR EACH ROW EXECUTE FUNCTION dxt_sample.immutable();
CREATE TRIGGER clone_origin_no_truncate BEFORE TRUNCATE ON dxt_sample.revision_clone_origin
 FOR EACH STATEMENT EXECUTE FUNCTION dxt_sample.immutable();
REVOKE ALL ON dxt_sample.revision_clone_origin FROM PUBLIC;
CREATE OR REPLACE FUNCTION dxt_sample.write_revision(pid text, cmd text, expected_latest integer, doc jsonb)
 RETURNS dxt_sample.revision LANGUAGE plpgsql SECURITY DEFINER
 SET search_path=pg_catalog,dxt_sample,public,pg_temp AS $$
DECLARE s jsonb := doc->'sample'; r jsonb := doc->'revision';
 sid text := s->>'id'; org text := doc->>'owningOrgId'; prior dxt_sample.command_receipt;
 answer dxt_sample.revision; latest integer; creating boolean := expected_latest=0;
 request jsonb := jsonb_build_object('expectedLatest',expected_latest,'document',doc);
BEGIN
 IF pid IS NULL OR cmd IS NULL OR btrim(cmd)='' OR expected_latest IS NULL OR expected_latest<0
  OR sid IS NULL OR org IS NULL OR doc IS NULL THEN
  RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Required Sample command fields are missing'; END IF;
 IF NOT dxt_sample.allowed(pid,org,CASE WHEN creating THEN NULL ELSE sid END,
      CASE WHEN creating THEN 'REGISTER_SAMPLE' ELSE 'REVISE_SAMPLE' END)
    OR NOT dxt_sample.allowed(pid,org,CASE WHEN creating THEN NULL ELSE sid END,'READ_SAMPLE') THEN
  RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Explicit Sample capability required'; END IF;
 -- Serialize idempotency receipts, then revision allocation. Recheck authorization on every retry.
 PERFORM pg_advisory_xact_lock(hashtextextended(pid||':'||cmd,0));
 SELECT * INTO prior FROM dxt_sample.command_receipt WHERE actor_id=pid AND command_id=cmd;
 IF FOUND THEN
  IF prior.request IS DISTINCT FROM request THEN
   RAISE EXCEPTION USING ERRCODE='23505',MESSAGE='Command already used with different content'; END IF;
  SELECT * INTO answer FROM dxt_sample.revision WHERE id=prior.revision_id; RETURN answer;
 END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('sample:'||sid,0));
 IF s->>'materialId' IS NOT NULL OR s->>'supplierId' IS NOT NULL THEN
  RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Authoritative material or supplier reference unavailable'; END IF;
 IF (r->>'sampleId') IS DISTINCT FROM sid OR (r->>'revision')::integer IS DISTINCT FROM expected_latest+1
  OR r->>'id' IS NULL OR r->>'registrationSource' IS NULL
  OR r->>'registrationSource' NOT IN ('SUPPLIER_REQUEST','INTERNAL_REQUEST','DIRECT_REGISTRATION')
  OR r->>'status' IS NULL OR r->>'status' NOT IN ('Draft','Active','Retired')
  OR r->>'effectiveAt' IS NULL OR r->>'createdAt' IS NULL THEN
  RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Revision metadata does not match command'; END IF;
 PERFORM (r->>'effectiveAt')::timestamptz, (r->>'createdAt')::timestamptz;
 IF creating THEN
  INSERT INTO dxt_sample.sample VALUES(sid,org,s->>'sampleCode',s->>'name',NULL,NULL,s->>'description',s->>'status',(s->>'createdAt')::timestamptz,pid);
 ELSE
  PERFORM 1 FROM dxt_sample.sample WHERE id=sid AND owning_org_id=org FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Sample unavailable'; END IF;
  -- Identity is immutable; do not silently accept an edit while appending a revision.
  IF NOT EXISTS(SELECT 1 FROM dxt_sample.sample x WHERE x.id=sid
   AND x.sample_code=s->>'sampleCode' AND x.name=s->>'name'
   AND x.description IS NOT DISTINCT FROM s->>'description'
   AND x.status=s->>'status' AND x.created_at=(s->>'createdAt')::timestamptz) THEN
   RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Sample identity cannot change during revision creation'; END IF;
 END IF;
 IF creating THEN
  IF doc->'cloneOrigin' IS NOT NULL AND doc->'cloneOrigin' <> 'null'::jsonb THEN
   RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Initial revision cannot clone an existing revision'; END IF;
 ELSIF doc->'cloneOrigin' IS NOT NULL AND doc->'cloneOrigin' <> 'null'::jsonb THEN
  IF NOT EXISTS(SELECT 1 FROM dxt_sample.revision source WHERE source.id=doc->'cloneOrigin'->>'copiedFromRevisionId' AND source.sample_id=sid) THEN
   RAISE EXCEPTION USING ERRCODE='22023',MESSAGE='Choose an existing source revision of this Sample'; END IF;
 END IF;
 SELECT COALESCE(max(revision_number),0) INTO latest FROM dxt_sample.revision WHERE sample_id=sid;
 IF latest<>expected_latest THEN RAISE EXCEPTION USING ERRCODE='40001',MESSAGE='Sample changed; reload before creating revision'; END IF;
 INSERT INTO dxt_sample.revision(id,sample_id,revision_number,metadata,composition,properties,created_by)
 VALUES(r->>'id',sid,expected_latest+1,r,doc->'composition',doc->'properties',pid) RETURNING * INTO answer;
 IF NOT creating AND doc->'cloneOrigin' IS NOT NULL AND doc->'cloneOrigin' <> 'null'::jsonb THEN
  INSERT INTO dxt_sample.revision_clone_origin(revision_id,sample_id,copied_from_revision_id,change_reason)
  VALUES(answer.id,sid,doc->'cloneOrigin'->>'copiedFromRevisionId',NULLIF(btrim(doc->'cloneOrigin'->>'changeReason'),''));
 END IF;
 INSERT INTO dxt_sample.command_receipt VALUES(pid,cmd,request,answer.id);
 RETURN answer;
END $$;

COMMIT;
