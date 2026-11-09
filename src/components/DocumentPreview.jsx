import { useEffect, useState } from 'react';

// Local URLs live only as long as the selected file's preview.
export default function DocumentPreview({ file, url, name, type }) {
  const [local, setLocal] = useState(null);
  useEffect(() => {
    if (!(file instanceof Blob)) return;
    const objectUrl = URL.createObjectURL(file);
    // The URL is an external browser resource allocated and released by this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocal({ file, url: objectUrl });
    return () => URL.revokeObjectURL(objectUrl);
  }, [file]);
  const source = file ? (local?.file === file ? local.url : '') : url;
  const filename = name || file?.name || 'Document';
  const format = type || file?.type || '';
  const image = format.startsWith('image/') || format === 'image' || [filename, url || ''].some(value => /\.(png|jpe?g|gif|webp|avif|bmp)(?:[?#]|$)/i.test(value));
  const pdf = format === 'application/pdf' || format === 'pdf' || [filename, url || ''].some(value => /\.pdf(?:[?#]|$)/i.test(value));
  if (!file && !url) return null;
  return <span className="inline-flex w-36 max-w-full shrink-0 flex-col gap-1 rounded-lg border border-slate-200 bg-white p-2 text-left align-top">
    {source && image ? <img src={source} alt={'Preview of ' + filename} className="h-20 w-full rounded object-contain" />
      : source && pdf ? <object data={source + '#page=1&toolbar=0&navpanes=0'} type="application/pdf" aria-label={'Preview of ' + filename} className="h-24 w-full rounded"><span className="text-xs text-slate-500">PDF preview unavailable. Use Open.</span></object>
        : <span className="flex h-16 items-center justify-center rounded bg-slate-50 text-xs font-bold uppercase text-slate-500">{filename.split('.').pop()?.slice(0, 8) || 'FILE'}</span>}
    <span title={filename} className="block truncate text-[10px] font-semibold text-slate-700">{filename}</span>
    {source && <a href={source} target="_blank" rel="noopener noreferrer" onClick={event => event.stopPropagation()} className="text-[10px] font-bold text-amber-700 underline" aria-label={'Open ' + filename}>Open</a>}
  </span>;
}
