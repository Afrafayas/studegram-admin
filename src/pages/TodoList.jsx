import ListFilterTabs from '../components/ListFilterTabs';
import ListRecordView from '../components/ListRecordView';
import useServerList from '../hooks/useServerList';
import ListToolbar, { ListPager } from '../components/ListToolbar';
import ActionMenu from '../components/ActionMenu';
import { ActionButton, ActionForm } from '../components/ActionControls';
import React, { useState, useEffect } from 'react';
import API from '../api/axios';
import { useToast } from '../context/ToastContext';

export default function TodoList({ todoList = [], setTodoList }) {
  const [listRecord, setListRecord] = React.useState(null);

  const toast = useToast();
  const [listSearch, setListSearch] = useState('');
  const [listStatus, setListStatus] = useState('All');
  const [listPriority, setListPriority] = useState('All');
  const [listPage, setListPage] = useState(1);
  const [listLimit, setListLimit] = useState(15);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newTask, setNewTask] = useState('');
  const [newPriority, setNewPriority] = useState('Medium');
  const [isAdding, setIsAdding] = useState(false);

  const serverList = useServerList('/todos', {
    search: listSearch,
    filters: { status: listStatus, priority: listPriority },
    page: listPage,
    limit: listLimit,
    onPageChange: setListPage,
    reloadKey: JSON.stringify(todoList)
  });

  const visibleTasks = serverList.data.map(task => ({
    ...task,
    id: task._id || task.id,
    task: task.title,
    completed: task.status === 'Completed'
  }));

  useEffect(() => {
    setListPage(1);
  }, [listSearch, listStatus, listPriority]);

  useEffect(() => {
    let active = true;
    API.get('/todos').then(response => {
      if (!response.data?.success) throw new Error('Unable to load tasks.');
      if (active && setTodoList) {
        setTodoList(response.data.data.map(task => ({
          ...task,
          id: task._id,
          task: task.title,
          completed: task.status === 'Completed'
        })));
      }
    }).catch(error => {
      if (active) toast.error(error.response?.data?.message || error.message);
    });
    return () => { active = false; };
  }, [setTodoList]);

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!newTask.trim()) return;

    setIsAdding(true);
    try {
      const response = await API.post('/todos', {
        title: newTask.trim(),
        priority: newPriority,
        status: 'Pending'
      });
      if (!response.data?.success) throw new Error(response.data?.message || 'Unable to save task.');
      const taskItem = {
        ...response.data.data,
        id: response.data.data._id,
        task: response.data.data.title,
        completed: response.data.data.status === 'Completed'
      };

      if (setTodoList) {
        setTodoList(prev => [taskItem, ...prev]);
      }
      setNewTask('');
      setShowAddForm(false);
      serverList.reload();
      toast.success('Task created successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    } finally {
      setIsAdding(false);
    }
  };

  const toggleTask = async (id) => {
    const task = visibleTasks.find(item => item.id === id) || (todoList || []).find(item => item.id === id);
    if (!task) return;
    try {
      const newStatus = task.completed ? 'Pending' : 'Completed';
      const response = await API.put(`/todos/${id}`, { status: newStatus });
      if (!response.data?.success) throw new Error('Unable to update task.');
      const saved = {
        ...task,
        ...response.data.data,
        id,
        task: response.data.data.title,
        completed: response.data.data.status === 'Completed'
      };
      if (setTodoList) {
        setTodoList(prev => prev.some(item => item.id === id) ? prev.map(item => item.id === id ? saved : item) : [saved, ...prev]);
      }
      serverList.reload();
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    }
  };

  const deleteTask = async (id) => {
    try {
      const response = await API.delete(`/todos/${id}`);
      if (!response.data?.success) throw new Error('Unable to delete task.');
      if (setTodoList) {
        setTodoList(prev => prev.filter(item => item.id !== id));
      }
      serverList.reload();
      toast.success('Task deleted successfully');
    } catch (error) {
      toast.error(error.response?.data?.message || error.message);
    }
  };

  const totalCount = (todoList || []).length;
  const pendingCount = (todoList || []).filter(t => !t.completed).length;
  const completedCount = (todoList || []).filter(t => t.completed).length;

  return (
    listRecord ? <div className="workspace-page flex-1 p-4 sm:p-6"><ListRecordView record={listRecord} title={listRecord.displayName || listRecord.title || listRecord.name || listRecord.university || 'Record details'} onBack={() => setListRecord(null)} /></div> : (<div className="workspace-page flex-1 min-w-0 p-4 sm:p-6 space-y-6 bg-[#F0F2F5]">
      {/* Header */}
      <div className="workspace-panel flex flex-wrap gap-3 justify-between items-center bg-white border border-[#E2E8F0] border-t-4 border-t-[#D99A1C] p-6 rounded-2xl shadow-xs">
        <div className="space-y-1">
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Operations To-do List</h1>
          <p className="text-xs text-slate-500 font-medium">Daily checklist tasks for application processors and super administrators.</p>
        </div>
        <ActionButton
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-[#D99A1C] hover:bg-[#F5B025] text-white font-extrabold text-xs px-4 py-2 rounded-xl transition-all shadow-md inline-flex items-center gap-1.5 cursor-pointer"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>{showAddForm ? 'Close Form' : 'New Task'}</span>
        </ActionButton>
      </div>

      {/* Add Task Form Drawer/Collapse */}
      {showAddForm && (
        <div className="workspace-panel bg-white border border-[#E2E8F0] border-t-4 border-t-[#D99A1C] rounded-2xl p-6 shadow-xs">
          <ActionForm onSubmit={handleAddTask} className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              required
              value={newTask}
              onChange={(e) => setNewTask(e.target.value)}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white focus:border-[#D99A1C] focus:ring-1 focus:ring-[#D99A1C] transition-all text-slate-950"
              placeholder="Enter new checklist operations task..."
            />
            <select
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#D99A1C]"
            >
              <option value="Low">Low Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="High">High Priority</option>
              <option value="Urgent">Urgent Priority</option>
            </select>
            <ActionButton
              type="submit"
              disabled={isAdding}
              className="bg-[#D99A1C] hover:bg-[#F5B025] disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-1.5 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md shrink-0 uppercase tracking-wider"
            >
              {isAdding ? 'Adding...' : 'Add Task'}
            </ActionButton>
          </ActionForm>
        </div>
      )}

      {/* Table Frame */}
      <div className="workspace-panel workspace-list-frame bg-white border border-[#E2E8F0] border-t-4 border-t-[#D99A1C] rounded-2xl shadow-xs overflow-hidden">
        {/* Scoping Tabs */}
        <ListFilterTabs value={listStatus} onChange={value=>{setListStatus(value);setListPage(1);}} query={{endpoint:'/todos',search:listSearch,filters:{priority:listPriority},reloadKey:JSON.stringify(todoList)}} options={['All','Pending','In Progress','Completed'].map(value=>({value,label:value==='All'?'All tasks':value,filters:{status:value}}))} />

        {/* ListToolbar */}
        <ListToolbar
          search={listSearch}
          onSearchChange={setListSearch}
          filters={[
            {
              key: 'status',
              label: 'statuses',
              value: listStatus,
              onChange: setListStatus,
              options: ['Pending', 'In Progress', 'Completed']
            },
            {
              key: 'priority',
              label: 'priorities',
              value: listPriority,
              onChange: setListPriority,
              options: serverList.facets.priority || ['Low', 'Medium', 'High', 'Urgent']
            }
          ]}
          onReset={() => {
            setListSearch('');
            setListStatus('All');
            setListPriority('All');
          }}
          loading={serverList.loading}
          error={serverList.error}
          onRetry={serverList.reload}
        />

        

        <div className="overflow-x-auto">
          {visibleTasks.length > 0 ? (
            <table className="workspace-table w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-[#E2E8F0]">
                  <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider w-[50px]">Done</th>
                  <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Task Title</th>
                  <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Priority</th>
                  <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-slate-400 text-[10px] font-extrabold uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {visibleTasks.map((item) => (
                  <tr tabIndex={0} onKeyDown={event => { if (event.target === event.currentTarget && event.key === "Enter") { event.preventDefault(); event.currentTarget.click(); } }}
                    key={item.id}
                    onClick={() => setListRecord(item)}
                    className={`hover:bg-amber-50/40 transition-colors cursor-pointer group ${
                      item.completed ? 'bg-slate-50/60 opacity-70' : ''
                    }`}
                  >
                    <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={item.completed}
                        onChange={() => toggleTask(item.id)}
                        className="w-4 h-4 text-[#D99A1C] border-slate-300 rounded focus:ring-[#D99A1C] cursor-pointer"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs ${
                        item.completed ? 'line-through text-slate-400 font-medium' : 'text-slate-950 font-bold group-hover:text-[#D99A1C] transition-colors'
                      }`}>
                        {item.task}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold border ${
                        item.priority === 'Urgent' || item.priority === 'High'
                          ? 'bg-rose-50 text-rose-700 border-rose-200'
                          : item.priority === 'Medium'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-slate-50 text-slate-600 border-slate-200'
                      }`}>
                        {item.priority || 'Normal'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-extrabold border ${
                        item.completed
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200 font-black'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        {item.completed ? 'Completed' : (item.status || 'Pending')}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-400 font-medium text-[10px]">
                      {item.createdAt ? new Date(item.createdAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="px-6 py-4 text-right pr-6" onClick={(e) => e.stopPropagation()}>
                      <ActionMenu
                        items={[
                          {
                            label: item.completed ? 'Mark as Pending' : 'Mark as Completed',
                            onClick: () => toggleTask(item.id)
                          },
                          {
                            label: 'Delete Task',
                            variant: 'danger',
                            onClick: () => deleteTask(item.id)
                          }
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-12 text-center space-y-2">
              <svg className="w-12 h-12 text-slate-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="text-xs font-black text-slate-900 uppercase">Checklist is Empty</h3>
              <p className="text-[10px] text-slate-400 font-semibold max-w-xs mx-auto">Create operations items to coordinate daily tasks with your team.</p>
            </div>
          )}
        </div>
        <ListPager list={serverList} page={listPage} onPageChange={setListPage} limit={listLimit} onLimitChange={setListLimit} />
      </div>
    </div>)
  );
}
