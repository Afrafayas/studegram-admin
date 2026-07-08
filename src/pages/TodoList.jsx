import React, { useState } from 'react';

export default function TodoList({ todoList, setTodoList }) {
  const [newTask, setNewTask] = useState('');

  const handleAddTask = (e) => {
    e.preventDefault();
    if (!newTask.trim()) return;

    const taskItem = {
      id: Date.now(),
      task: newTask.trim(),
      completed: false
    };

    setTodoList(prev => [taskItem, ...prev]);
    setNewTask('');
  };

  const toggleTask = (id) => {
    setTodoList(prev => prev.map(item => {
      if (item.id === id) {
        return { ...item, completed: !item.completed };
      }
      return item;
    }));
  };

  const deleteTask = (id) => {
    setTodoList(prev => prev.filter(item => item.id !== id));
  };

  const pendingCount = todoList.filter(t => !t.completed).length;
  const completedCount = todoList.filter(t => t.completed).length;

  return (
    <div className="flex-1 p-6 space-y-6 bg-[#F8FAFC]">
      {/* Header */}
      <div className="flex justify-between items-center bg-white border border-[#E2E8F0] p-6 rounded-2xl shadow-xs">
        <div className="space-y-1">
          <h1 className="text-xl font-black text-slate-900 tracking-tight">Operations To-do List</h1>
          <p className="text-xs text-slate-500 font-medium">Daily checklist tasks for application processors and super administrators.</p>
        </div>
        <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
          <span className="bg-amber-50 text-amber-700 px-3 py-1.5 rounded-xl border border-amber-100">{pendingCount} Pending</span>
          <span className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-xl border border-emerald-100">{completedCount} Completed</span>
        </div>
      </div>

      {/* Form Input & Checklist */}
      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-6 shadow-xs max-w-2xl space-y-6">
        <form onSubmit={handleAddTask} className="flex gap-2">
          <input
            type="text"
            required
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-semibold focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all text-slate-950"
            placeholder="Add a new checklist operations task..."
          />
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl transition-all shadow-md shrink-0 uppercase tracking-wider"
          >
            Add Task
          </button>
        </form>

        <div className="space-y-2">
          {todoList.length > 0 ? (
            todoList.map((item) => (
              <div
                key={item.id}
                className={`flex items-center justify-between p-3.5 border rounded-xl transition-all ${
                  item.completed 
                    ? 'bg-slate-50 border-slate-100 opacity-60' 
                    : 'bg-white border-slate-200 hover:border-indigo-200'
                }`}
              >
                <div className="flex items-center gap-3 select-none flex-1">
                  <input
                    type="checkbox"
                    checked={item.completed}
                    onChange={() => toggleTask(item.id)}
                    className="w-4.5 h-4.5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500 cursor-pointer"
                  />
                  <span className={`text-xs font-semibold ${
                    item.completed ? 'line-through text-slate-400 font-medium' : 'text-slate-950 font-bold'
                  }`}>
                    {item.task}
                  </span>
                </div>

                <button
                  onClick={() => deleteTask(item.id)}
                  className="text-slate-400 hover:text-rose-600 p-1 rounded-lg transition-colors"
                  title="Delete Task"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            ))
          ) : (
            <div className="p-8 text-center space-y-2">
              <svg className="w-12 h-12 text-slate-300 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="text-xs font-black text-slate-900 uppercase">Checklist is Empty</h3>
              <p className="text-[10px] text-slate-400 font-semibold max-w-xs mx-auto">Create operations items to coordinate daily tasks with your team.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
