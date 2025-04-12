document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const taskInput = document.getElementById('taskInput');
    const dueDateInput = document.getElementById('dueDateInput');
    const addTaskBtn = document.getElementById('addTaskBtn');
    const taskList = document.getElementById('taskList');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const tasksLeft = document.getElementById('tasksLeft');
    const clearCompletedBtn = document.getElementById('clearCompleted');
    const darkModeToggle = document.getElementById('darkModeToggle');
    const body = document.body;
    
    // Initialize date picker
    const datePicker = flatpickr(dueDateInput, {
        dateFormat: "Y-m-d",
        minDate: "today",
        allowInput: true
    });
    
    // Tasks array
    let tasks = JSON.parse(localStorage.getItem('tasks')) || [];
    let draggedItem = null;
    
    // Theme settings
    const currentTheme = localStorage.getItem('theme') || 'light';
    body.setAttribute('data-theme', currentTheme);
    
    // Initialize the app
    function init() {
        renderTasks();
        updateTasksLeft();
        setupDragAndDrop();
    }
    
    // Add a new task
    function addTask() {
        const taskText = taskInput.value.trim();
        if (taskText === '') return;
        
        const dueDate = dueDateInput.value || null;
        
        const newTask = {
            id: Date.now(),
            text: taskText,
            completed: false,
            dueDate: dueDate,
            position: tasks.length > 0 ? Math.max(...tasks.map(t => t.position)) + 1 : 0
        };
        
        tasks.push(newTask);
        saveTasks();
        renderTasks();
        updateTasksLeft();
        
        taskInput.value = '';
        dueDateInput.value = '';
        taskInput.focus();
    }
    
    // Render tasks based on current filter
    function renderTasks(filter = 'all') {
        taskList.innerHTML = '';
        
        // Sort tasks by position
        tasks.sort((a, b) => a.position - b.position);
        
        let filteredTasks = tasks;
        const today = new Date().toISOString().split('T')[0];
        
        if (filter === 'active') {
            filteredTasks = tasks.filter(task => !task.completed);
        } else if (filter === 'completed') {
            filteredTasks = tasks.filter(task => task.completed);
        } else if (filter === 'overdue') {
            filteredTasks = tasks.filter(task => 
                !task.completed && 
                task.dueDate && 
                task.dueDate < today
            );
        }
        
        if (filteredTasks.length === 0) {
            taskList.innerHTML = '<li class="empty-message">No tasks found</li>';
            return;
        }
        
        filteredTasks.forEach(task => {
            const taskItem = document.createElement('li');
            taskItem.className = 'task-item';
            taskItem.dataset.id = task.id;
            taskItem.draggable = true;
            
            const dueDateClass = getDueDateClass(task.dueDate);
            const dueDateDisplay = task.dueDate ? formatDueDate(task.dueDate) : 'No due date';
            
            taskItem.innerHTML = `
                <input type="checkbox" class="task-checkbox" ${task.completed ? 'checked' : ''}>
                <div class="task-content">
                    <span class="task-text ${task.completed ? 'completed' : ''}">${task.text}</span>
                    ${task.dueDate ? `
                    <span class="task-due-date ${dueDateClass}">
                        <i class="far fa-calendar-alt"></i>
                        ${dueDateDisplay}
                    </span>
                    ` : ''}
                </div>
                <div class="task-actions">
                    <button class="edit-btn"><i class="far fa-edit"></i></button>
                    <button class="delete-btn"><i class="fas fa-trash"></i></button>
                </div>
            `;
            
            taskList.appendChild(taskItem);
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
    
    // Toggle task completion status
    function toggleTaskCompletion(taskId) {
        tasks = tasks.map(task => {
            if (task.id === Number(taskId)) {
                return { ...task, completed: !task.completed };
            }
            return task;
        });
        
        saveTasks();
        updateTasksLeft();
    }
    
    // Delete a task
    function deleteTask(taskId) {
        tasks = tasks.filter(task => task.id !== Number(taskId));
        saveTasks();
        renderTasks(getCurrentFilter());
        updateTasksLeft();
    }
    
    // Edit a task
    function editTask(taskId) {
        const task = tasks.find(t => t.id === Number(taskId));
        if (!task) return;
        
        const taskItem = document.querySelector(`.task-item[data-id="${taskId}"]`);
        if (!taskItem) return;
        
        const taskText = taskItem.querySelector('.task-text');
        const taskContent = taskItem.querySelector('.task-content');
        const dueDateElement = taskItem.querySelector('.task-due-date');
        
        // Create edit input
        const editInput = document.createElement('input');
        editInput.type = 'text';
        editInput.className = 'edit-input';
        editInput.value = task.text;
        
        // Create date input
        const editDateInput = document.createElement('input');
        editDateInput.type = 'text';
        editDateInput.className = 'edit-date-input';
        editDateInput.value = task.dueDate || '';
        editDateInput.placeholder = 'Due date';
        
        // Replace content with inputs
        taskContent.innerHTML = '';
        taskContent.appendChild(editInput);
        taskContent.appendChild(editDateInput);
        
        // Initialize date picker for the edit input
        flatpickr(editDateInput, {
            dateFormat: "Y-m-d",
            minDate: "today",
            allowInput: true
        });
        
        editInput.focus();
        
        // Save on Enter or blur
        function saveEdit() {
            const newText = editInput.value.trim();
            const newDueDate = editDateInput.value || null;
            
            if (newText !== '') {
                task.text = newText;
                task.dueDate = newDueDate;
                saveTasks();
                renderTasks(getCurrentFilter());
            } else {
                renderTasks(getCurrentFilter());
            }
        }
        
        editInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                saveEdit();
            }
        });
        
        editInput.addEventListener('blur', saveEdit);
        editDateInput.addEventListener('blur', saveEdit);
    }
    
    // Clear all completed tasks
    function clearCompletedTasks() {
        tasks = tasks.filter(task => !task.completed);
        saveTasks();
        renderTasks(getCurrentFilter());
        updateTasksLeft();
    }
    
    // Update tasks left counter
    function updateTasksLeft() {
        const activeTasks = tasks.filter(task => !task.completed).length;
        tasksLeft.textContent = `${activeTasks} ${activeTasks === 1 ? 'task' : 'tasks'} left`;
    }
    
    // Save tasks to localStorage
    function saveTasks() {
        localStorage.setItem('tasks', JSON.stringify(tasks));
    }
    
    // Get current active filter
    function getCurrentFilter() {
        const activeFilter = document.querySelector('.filter-btn.active');
        return activeFilter ? activeFilter.dataset.filter : 'all';
    }
    
    // Toggle dark mode
    function toggleDarkMode() {
        const currentTheme = body.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        body.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    }
    
    // Setup drag and drop functionality
    function setupDragAndDrop() {
        taskList.addEventListener('dragstart', function(e) {
            if (e.target.classList.contains('task-item')) {
                draggedItem = e.target;
                setTimeout(() => {
                    draggedItem.classList.add('dragging');
                }, 0);
            }
        });
        
        taskList.addEventListener('dragend', function() {
            if (draggedItem) {
                draggedItem.classList.remove('dragging');
                draggedItem = null;
            }
        });
        
        taskList.addEventListener('dragover', function(e) {
            e.preventDefault();
            const afterElement = getDragAfterElement(taskList, e.clientY);
            const currentItem = document.querySelector('.dragging');
            
            if (!currentItem) return;
            
            if (afterElement == null) {
                taskList.appendChild(currentItem);
            } else {
                taskList.insertBefore(currentItem, afterElement);
            }
        });
        
        taskList.addEventListener('drop', function() {
            // Update task positions based on new order
            const taskItems = Array.from(taskList.children);
            taskItems.forEach((item, index) => {
                const taskId = Number(item.dataset.id);
                const task = tasks.find(t => t.id === taskId);
                if (task) {
                    task.position = index;
                }
            });
            
            saveTasks();
        });
    }
    
    // Helper function for drag and drop positioning
    function getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.task-item:not(.dragging)')];
        
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }
    
    // Event Listeners
    addTaskBtn.addEventListener('click', addTask);
    
    taskInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            addTask();
        }
    });
    
    taskList.addEventListener('click', function(e) {
        const taskItem = e.target.closest('.task-item');
        if (!taskItem) return;
        
        const taskId = taskItem.dataset.id;
        
        if (e.target.classList.contains('task-checkbox')) {
            toggleTaskCompletion(taskId);
            // Update the visual state immediately
            const taskText = taskItem.querySelector('.task-text');
            taskText.classList.toggle('completed', e.target.checked);
            updateTasksLeft();
        } else if (e.target.classList.contains('delete-btn') || e.target.closest('.delete-btn')) {
            deleteTask(taskId);
        } else if (e.target.classList.contains('edit-btn') || e.target.closest('.edit-btn')) {
            editTask(taskId);
        }
    });
    
    filterBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            filterBtns.forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            renderTasks(this.dataset.filter);
        });
    });
    
    clearCompletedBtn.addEventListener('click', clearCompletedTasks);
    
    darkModeToggle.addEventListener('click', toggleDarkMode);
    
    // Initialize the app
    init();
});