'use client';
import { useEffect, useState } from 'react';
import { useLocale } from '@/src/shared/i18n/locale';
import { Plus, ArrowLeft, ArrowRight } from 'lucide-react';
import { definitions } from '@/src/mock/reference';
export function CreateSample() {
  const { t } = useLocale();
  const [open, setOpen] = useState(false),
    [step, setStep] = useState(0),
    [code, setCode] = useState('D040'),
    [name, setName] = useState('New development sample'),
    [nodes, setNodes] = useState([
      {
        id: 1,
        label: 'Raw Material',
        type: 'RAW_MATERIAL',
        ratio: 100,
        parent: null as number | null,
      },
    ]),
    [properties, setProperties] = useState([
      { definitionId: 'property-viscosity-v1', value: '' },
    ]);
  useEffect(() => {
    if (!open) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', close);
    return () => window.removeEventListener('keydown', close);
  }, [open]);
  const add = (type: string, parent: number | null = null) =>
    setNodes((n) => [
      ...n,
      {
        id: Date.now(),
        label: type === 'INTERMEDIATE' ? 'Intermediate Blend' : 'Raw Material',
        type,
        ratio: 0,
        parent,
      },
    ]);
  return (
    <>
      <button className="primary-button" onClick={() => setOpen(true)}>
        <Plus size={15} />
        {t('Create sample')}
      </button>
      {open && (
        <div className="modal-backdrop" role="presentation">
          <dialog
            open
            className="sample-modal sample-create-final"
            aria-modal="true"
            aria-label={t('Create sample')}
          >
            <header>
              <div>
                <span className="eyebrow">
                  {t('Samples')} / {t('New Sample')}
                </span>
                <h2>{t(step === 4 ? 'Review Sample' : 'Create Sample')}</h2>
              </div>
              <footer>
                <button
                  className="secondary-button"

                  onClick={() => (step === 4 ? setStep(0) : setOpen(false))}
                >
                  <ArrowLeft size={14} />
                  {t(step === 4 ? 'Back' : 'Cancel')}
                </button>
                <button
                  className="primary-button"
                  onClick={() => (step === 4 ? setOpen(false) : setStep(4))}
                >
                  {t(step === 4 ? 'Finish review' : 'Review Sample')}
                  {step < 4 && <ArrowRight size={14} />}
                </button>
              </footer>
            </header>
            <div className="step-body">
              <p className="catalog-preview-notice">
                {t('Registration preview only. No sample will be saved.')}
              </p>
              {step !== 4 && (
                <div className="form-grid">
                  <label>
                    {t('Sample code')}
                    <input
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                    />
                  </label>
                  <label>
                    {t('Name')}
                    <input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </label>
                  <label>
                    {t('Supplier')}
                    <select>
                      <option value="Supplier A">{t('Supplier A')}</option>
                      <option value="Supplier B">{t('Supplier B')}</option>
                    </select>
                  </label>
                  <label>
                    {t('Description')}
                    <textarea defaultValue="Development sample registered in DXT LIMS." />
                  </label>
                </div>
              )}
              {step !== 4 && (
                <details className="catalog-advanced">
                  <summary>{t('Revision Information')}</summary>
                  <div className="form-grid">
                    <label>
                      {t('Revision')}
                      <input value="01" readOnly />
                    </label>
                    <label>
                      {t('Registration source')}
                      <select>
                        <option value="Direct Registration">
                          {t('Direct Registration')}
                        </option>
                        <option value="Internal Request">
                          {t('Internal Request')}
                        </option>
                        <option value="Supplier Request">
                          {t('Supplier Request')}
                        </option>
                      </select>
                    </label>
                    <label>
                      {t('Request number')}
                      <input placeholder={t('Optional')} />
                    </label>
                    <label>
                      {t('Development item number')}
                      <input placeholder={t('Optional')} />
                    </label>
                  </div>
                </details>
              )}
              {step !== 4 && (
                <div>
                  <details className="catalog-advanced">
                    <summary>{t('Material Structure')}</summary>
                    <div className="editor-actions">
                      <button
                        className="secondary-button"
                        onClick={() => add('RAW_MATERIAL')}
                      >
                        <Plus size={14} />
                        {t('Add Raw Material')}
                      </button>
                      <button
                        className="secondary-button"
                        onClick={() => add('INTERMEDIATE')}
                      >
                        <Plus size={14} />
                        {t('Add Intermediate')}
                      </button>
                      <button
                        className="secondary-button"
                        onClick={() =>
                          add(
                            'RAW_MATERIAL',
                            nodes.find((n) => n.type === 'INTERMEDIATE')?.id ??
                              null,
                          )
                        }
                      >
                        <Plus size={14} />
                        {t('Add Child Material')}
                      </button>
                    </div>
                    <div className="structure-editor">
                      {nodes.map((n) => (
                        <div
                          key={n.id}
                          style={{ marginLeft: n.parent ? 32 : 0 }}
                        >
                          <span>
                            {n.type === 'INTERMEDIATE'
                              ? 'Intermediate'
                              : 'Raw material'}
                          </span>
                          <input
                            value={n.label}
                            onChange={(e) =>
                              setNodes((all) =>
                                all.map((x) =>
                                  x.id === n.id
                                    ? { ...x, label: e.target.value }
                                    : x,
                                ),
                              )
                            }
                          />
                          <input
                            type="number"
                            aria-label={`${n.label} ratio`}
                            value={n.ratio}
                            onChange={(e) =>
                              setNodes((all) =>
                                all.map((x) =>
                                  x.id === n.id
                                    ? { ...x, ratio: Number(e.target.value) }
                                    : x,
                                ),
                              )
                            }
                          />
                          <b>%</b>
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              )}
              {step !== 4 && (
                <div>
                  <p className="muted">
                    {t(
                      'Property fields come from active Property Definitions.',
                    )}
                  </p>
                  {properties.map((p, i) => (
                    <div className="property-editor" key={i}>
                      <select
                        value={p.definitionId}
                        onChange={(e) =>
                          setProperties((all) =>
                            all.map((x, j) =>
                              j === i
                                ? { ...x, definitionId: e.target.value }
                                : x,
                            ),
                          )
                        }
                      >
                        {definitions.properties.map((d) => (
                          <option value={d.id} key={d.id}>
                            {d.name}
                          </option>
                        ))}
                      </select>
                      <input
                        placeholder={t('Value')}
                        value={p.value}
                        onChange={(e) =>
                          setProperties((all) =>
                            all.map((x, j) =>
                              j === i ? { ...x, value: e.target.value } : x,
                            ),
                          )
                        }
                      />
                    </div>
                  ))}
                  <button
                    className="secondary-button"
                    onClick={() =>
                      setProperties((p) => [
                        ...p,
                        {
                          definitionId: definitions.properties[0].id,
                          value: '',
                        },
                      ])
                    }
                  >
                    <Plus size={14} />
                    {t('Add property')}
                  </button>
                </div>
              )}
              {step === 4 && (
                <div className="review-sheet">
                  <h3>
                    {code} · {name}
                  </h3>
                  <p>{t('Revision 01 · Direct Registration')}</p>
                  <p>
                    {nodes.length} {t('structure entries ·')}
                    {properties.length} {t('configured properties')}
                  </p>
                  <p className="muted">
                    {t(
                      'This mock review demonstrates the native registration contract. It does not persist data.',
                    )}
                  </p>
                </div>
              )}
            </div>
          </dialog>
        </div>
      )}
    </>
  );
}
