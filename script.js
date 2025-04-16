document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const taskTitleInput = document.getElementById('taskTitleInput');
    const addTaskBtn = document.getElementById('addTaskBtn');
    const taskPopup = document.getElementById('taskPopup');
    const popupTaskTitle = document.getElementById('popupTaskTitle');
    const taskDetails = document.getElementById('taskDetails');
    const taskDueDate = document.getElementById('taskDueDate');
    const cancelTaskBtn = document.getElementById('cancelTaskBtn');
    const submitTaskBtn = document.getElementById('submitTaskBtn');
    const taskList = document.getElementById('taskList');
    const tasksLeft = document.getElementById('tasksLeft');
    const darkModeToggle = document.getElementById('darkModeToggle');
    const sortBy = document.getElementById('sortBy');
    const statusBtns = document.querySelectorAll('.status-btn');
    const body = document.body;
    
    // Initialize date picker
    const datePicker = flatpickr(taskDueDate, {
        dateFormat: "Y-m-d",
        minDate: "today",
        allowInput: true
    });
    
    // Tasks array
    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    
    // Theme settings
    const currentTheme = localStorage.getItem('theme') || 'light';
    body.setAttribute('data-theme', currentTheme);
    
    // Current filter and sort settings
    let currentFilter = 'all';
    let currentSort = 'dueDate';
    
    // Initialize the app
    function init() {
        renderTasks();
        updateTasksLeft();
    }
    
    // Show task creation popup
    function showTaskPopup() {
        const title = taskTitleInput.value.trim();
        if (title === '') return;
        
        popupTaskTitle.value = title;
        taskDetails.value = '';
        datePicker.clear();
        document.querySelector('input[name="priority"][value="low"]').checked = true;
        
        taskPopup.style.display = 'flex';
    }
    
    // Hide task creation popup
    function hideTaskPopup() {
        taskPopup.style.display = 'none';
        taskTitleInput.value = '';
        taskTitleInput.focus();
    }
    
    // Add a new task
    function addTask() {
        const title = popupTaskTitle.value.trim();
        const details = taskDetails.value.trim();
        const dueDate = taskDueDate.value || null;
        const priority = document.querySelector('input[name="priority"]:checked').value;
        
        const newTask = {
            id: Date.now(),
            title: title,
            details: details,
            dueDate: dueDate,
            priority: priority,
            status: 'incomplete',
            createdAt: new Date().toISOString()
        };
        
        tasks.push(newTask);
        saveTasks();
        renderTasks();
        updateTasksLeft();
        hideTaskPopup();
    }
    
    // Render tasks based on current filter and sort
    function renderTasks() {
        taskList.innerHTML = '';
        
        // Filter tasks
        let filteredTasks = tasks;
        if (currentFilter === 'incomplete') {
            filteredTasks = tasks.filter(task => task.status === 'incomplete');
        } else if (currentFilter === 'in-progress') {
            filteredTasks = tasks.filter(task => task.status === 'in-progress');
        } else if (currentFilter === 'completed') {
            filteredTasks = tasks.filter(task => task.status === 'completed');
        }
        
        // Sort tasks
        filteredTasks = sortTasks(filteredTasks, currentSort);
        
        if (filteredTasks.length === 0) {
            taskList.innerHTML = '<li class="empty-message">No tasks found</li>';
            return;
        }
        
        filteredTasks.forEach(task => {
            const taskItem = document.createElement('li');
            taskItem.className = 'task-item';
            taskItem.dataset.id = task.id;
            
            const dueDateClass = getDueDateClass(task.dueDate);
            const dueDateDisplay = task.dueDate ? formatDueDate(task.dueDate) : 'No due date';
            
            taskItem.innerHTML = `
                <div class="task-header">
                    <span class="task-title ${task.status === 'completed' ? 'completed' : ''}">${task.title}</span>
                    <span class="task-priority ${task.priority}">${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}</span>
                </div>
                ${task.details ? `<div class="task-details">${task.details}</div>` : ''}
                <div class="task-footer">
                    <div class="task-due-date ${dueDateClass}">
                        <i class="far fa-calendar-alt"></i>
                        ${dueDateDisplay}
                    </div>
                    <div class="task-actions">
                        <span class="task-status ${task.status.replace(' ', '-')}">
                            ${task.status === 'incomplete' ? 'Incomplete' : 
                              task.status === 'in-progress' ? 'In Progress' : 'Completed'}
                        </span>
                        <button class="action-btn edit-btn" title="Edit"><i class="far fa-edit"></i></button>
                        <button class="action-btn delete-btn" title="Delete"><i class="far fa-trash-alt"></i></button>
                    </div>
                </div>
            `;
            
            taskList.appendChild(taskItem);
        });
    }
    
    // Sort tasks based on selected option
    function sortTasks(tasks, sortBy) {
        const today = new Date().toISOString().split('T')[0];
        
        return [...tasks].sort((a, b) => {
            switch(sortBy) {
                case 'dueDate':
                    if (!a.dueDate && !b.dueDate) return 0;
                    if (!a.dueDate) return 1;
                    if (!b.dueDate) return -1;
                    return a.dueDate.localeCompare(b.dueDate);
                
                case 'priority':
                    const priorityOrder = { high: 1, medium: 2, low: 3 };
                    return priorityOrder[a.priority] - priorityOrder[b.priority];
                
                case 'status':
                    const statusOrder = { incomplete: 1, 'in-progress': 2, completed: 3 };
                    return statusOrder[a.status] - statusOrder[b.status];
                
                case 'creationDate':
                    return new Date(b.createdAt) - new Date(a.createdAt);
                
                default:
                    return 0;
            }
        });
    }
    
    // Get CSS class for due date based on status
    function getDueDateClass(dueDate) {
        if (!dueDate) return '';
        
        const today = new Date().toISOString().split('T')[0];
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];
        
        if (dueDate < today) return 'overdue';
        if (dueDate === today) return 'today';
        if (dueDate === tomorrowStr) return 'upcoming';
        return '';
    }
    
    // Format due date for display
    function formatDueDate(dateStr) {
        const options = { weekday: 'short', month: 'short', day: 'numeric' };
        const date = new Date(dateStr);
        return date.toLocaleDateString(undefined, options);
    }
    
    // Update task status
    function updateTaskStatus(taskId, newStatus) {
        tasks = tasks.map(task => {
            if (task.id === taskId) {
                return { ...task, status: newStatus };
            }
            return task;
        });
        
        saveTasks();
        renderTasks();
        updateTasksLeft();
    }
    
    // Delete a task
    function deleteTask(taskId) {
        tasks = tasks.filter(task => task.id !== taskId);
        saveTasks();
        renderTasks();
        updateTasksLeft();
    }
    
    // Edit a task
    function editTask(taskId) {
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;
        
        // Show popup with task details
        popupTaskTitle.value = task.title;
        taskDetails.value = task.details;
        if (task.dueDate) {
            datePicker.setDate(task.dueDate);
        } else {
            datePicker.clear();
        }
        document.querySelector(`input[name="priority"][value="${task.priority}"]`).checked = true;
        
        taskPopup.style.display = 'flex';
        
        // Change submit button text
        submitTaskBtn.textContent = 'Update Task';
        
        // Remove previous event listener if any
        submitTaskBtn.replaceWith(submitTaskBtn.cloneNode(true));
        const newSubmitBtn = document.getElementById('submitTaskBtn');
        
        // Add new event listener for update
        newSubmitBtn.addEventListener('click', function updateTask() {
            const title = popupTaskTitle.value.trim();
            const details = taskDetails.value.trim();
            const dueDate = taskDueDate.value || null;
            const priority = document.querySelector('input[name="priority"]:checked').value;
            
            tasks = tasks.map(t => {
                if (t.id === taskId) {
                    return { 
                        ...t, 
                        title: title,
                        details: details,
                        dueDate: dueDate,
                        priority: priority
                    };
                }
                return t;
            });
            
            saveTasks();
            renderTasks();
            hideTaskPopup();
            
            // Restore original submit button
            newSubmitBtn.textContent = 'Create Task';
            newSubmitBtn.removeEventListener('click', updateTask);
            newSubmitBtn.addEventListener('click', addTask);
        });
    }
    
    // Update tasks left counter
    function updateTasksLeft() {
        const incompleteTasks = tasks.filter(task => task.status !== 'completed').length;
        tasksLeft.textContent = `${incompleteTasks} ${incompleteTasks === 1 ? 'task' : 'tasks'} left`;
    }
    
    // Save tasks to localStorage
    function saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }
    
    // Toggle dark mode
    function toggleDarkMode() {
        const currentTheme = body.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        body.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    }
    
    // Event Listeners
    addTaskBtn.addEventListener('click', showTaskPopup);
    
    taskTitleInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            showTaskPopup();
        }
    });
    
    cancelTaskBtn.addEventListener('click', hideTaskPopup);
    submitTaskBtn.addEventListener('click', addTask);
    
    taskList.addEventListener('click', function(e) {
        const taskItem = e.target.closest('.task-item');
        if (!taskItem) return;
        
        const taskId = Number(taskItem.dataset.id);
        
        if (e.target.classList.contains('edit-btn') || e.target.closest('.edit-btn')) {
            editTask(taskId);
        } else if (e.target.classList.contains('delete-btn') || e.target.closest('.delete-btn')) {
            if (confirm('Are you sure you want to delete this task?')) {
                deleteTask(taskId);
            }
        } else if (e.target.classList.contains('task-status') || e.target.closest('.task-status')) {
            const task = tasks.find(t => t.id === taskId);
            if (!task) return;
            
            let newStatus;
            if (task.status === 'incomplete') {
                newStatus = 'in-progress';
            } else if (task.status === 'in-progress') {
                newStatus = 'completed';
            } else {
                newStatus = 'incomplete';
            }
            
            updateTaskStatus(taskId, newStatus);
        }
    });
    
    sortBy.addEventListener('change', function() {
        currentSort = this.value;
        renderTasks();
    });
    
    statusBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            statusBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.dataset.status;
            renderTasks();
        });
    });
    
    darkModeToggle.addEventListener('click', toggleDarkMode);
    
    // Initialize the app
    init();
});