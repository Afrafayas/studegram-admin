import React from 'react';
import RowActions from './RowActions';
import { ActionButton } from './ActionControls';
export default function ActionMenu({items=[],label='Actions'}) {
 const actions=items.filter(Boolean);
 if(!actions.length)return null;
 return <RowActions label={label}>{actions.map((item,index)=>item.divider ? <hr key={index} className="my-1 border-slate-100"/> : <ActionButton key={item.label || index} type="button" role="menuitem" disabled={item.disabled} onClick={item.onClick} className={item.danger ? 'text-rose-600 hover:bg-rose-50' : 'text-slate-700 hover:bg-slate-50'}>{item.icon && <span aria-hidden="true" className="shrink-0">{item.icon}</span>}<span>{item.label}</span></ActionButton>)}</RowActions>;
}
