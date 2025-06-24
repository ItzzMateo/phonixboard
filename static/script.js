document.addEventListener("DOMContentLoaded", () => {
  // --- DOM-Elemente ---
  const taskModal = document.getElementById("task-modal");
  const taskForm = document.getElementById("task-form");
  const closeBtn = document.querySelector(".modal .close-btn");
  const titleError = document.getElementById("title-error");
  const darkModeToggle = document.getElementById("darkmode-toggle");

  const columns = {
    "To Do": document.getElementById("todo-tasks"),
    "In Progress": document.getElementById("progress-tasks"),
    Done: document.getElementById("done-tasks"),
  };

  let draggedTask = null;

  // --- FUNKTIONEN ---

  /**
   * Lädt alle Tasks vom Server und rendert das Board.
   */
  async function loadTasks() {
    try {
      showSkeletons();
      const response = await fetch("/api/tasks");
      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);
      const tasks = await response.json();

      // Spalten leeren, bevor neu gerendert wird
      Object.values(columns).forEach((col) => (col.innerHTML = ""));

      tasks.forEach((task) => {
        const columnEl = columns[task.status];
        if (columnEl) {
          const taskElement = createTaskElement(task);
          columnEl.appendChild(taskElement);
        }
      });

      // Sortiere jede Spalte nach dem initialen Rendern
      Object.keys(columns).forEach((status) => {
        sortAndReorderTasks(status, false); // false = nicht an API senden
      });

      updateTaskCounts();
      initDragAndDrop();
    } catch (error) {
      console.error("Fehler beim Laden der Tasks:", error);
      Object.values(columns).forEach(
        (col) =>
          (col.innerHTML =
            '<p class="error-loading">Fehler beim Laden der Aufgaben.</p>')
      );
    }
  }

  /**
   * Erstellt das HTML-Element für eine einzelne Task-Karte.
   * @param {object} task - Das Task-Objekt vom Server.
   * @returns {HTMLElement} - Das fertige div-Element für die Task-Karte.
   */
  function createTaskElement(task) {
    const card = document.createElement("div");
    card.className = "kanban-task";
    card.dataset.id = task.id;
    card.dataset.priority = task.priority || "normal";
    card.setAttribute("tabindex", "0");
    card.draggable = true;

    // Tags
    const tagsHTML = (task.tags || "")
      .split(",")
      .filter(Boolean)
      .map((tag) => `<span class="task-badge">${escapeHtml(tag.trim())}</span>`)
      .join("");

    // Fälligkeitsdatum
    let dueDateHTML = "";
    if (task.due_date) {
      const dueDate = new Date(task.due_date + "T00:00:00"); // Zeitzone berücksichtigen
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const isOverdue = dueDate < today;
      dueDateHTML = `<span class="due-date ${
        isOverdue ? "overdue" : ""
      }" title="Fällig am ${dueDate.toLocaleDateString("de-DE")}">
           <i class="fa-regular fa-calendar"></i>
           <span>${dueDate.toLocaleDateString("de-DE")}</span>
         </span>`;
    }

    // Subtasks
    let subtasks = [];
    if (task.subtasks) {
      try {
        subtasks = JSON.parse(task.subtasks);
      } catch (e) {
        /* ignore */
      }
    }
    const subtasksHTML =
      subtasks.length > 0
        ? `<div class="checklist">
             ${subtasks
               .map(
                 (sub, index) => `
               <div class="subtask">
                 <input type="checkbox" id="subtask-${
                   task.id
                 }-${index}" data-index="${index}" ${
                   sub.completed ? "checked" : ""
                 }>
                 <label for="subtask-${task.id}-${index}">${escapeHtml(
                   sub.text
                 )}</label>
               </div>
             `
               )
               .join("")}
           </div>`
        : "";

    // Card-Inhalt
    card.innerHTML = `
      <div class="task-header">
        <i class="fa-solid fa-grip-vertical drag-handle" title="Verschieben"></i>
        <h3 class="task-title">${escapeHtml(task.title)}</h3>
        <div class="task-menu">
          <button class="menu-btn" aria-label="Task-Menü öffnen"><i class="fa-solid fa-ellipsis-vertical"></i></button>
          <div class="menu-content">
            <a href="#" class="edit-btn"><i class="fa-solid fa-pen"></i> Bearbeiten</a>
            <a href="#" class="duplicate-btn"><i class="fa-solid fa-copy"></i> Duplizieren</a>
            <a href="#" class="delete-btn"><i class="fa-solid fa-trash"></i> Löschen</a>
          </div>
        </div>
      </div>
      <div class="task-body">
        <div class="task-desc">${marked.parse(task.description || "")}</div>
        ${subtasksHTML}
      </div>
      <div class="task-footer">
        <div class="task-meta">${dueDateHTML}</div>
        <div class="task-tags">${tagsHTML}</div>
      </div>
    `;

    // --- Event Listeners für die KARTE ---
    const menuBtn = card.querySelector(".menu-btn");
    const menuContent = card.querySelector(".menu-content");
    const menuItems = Array.from(menuContent.querySelectorAll("a"));

    menuBtn.setAttribute("title", "Optionen"); // Tooltip für den Button

    menuBtn.addEventListener("click", (e) => {
      e.stopPropagation(); // Verhindert, dass das window-click-Event sofort feuert
      const isActive = menuContent.classList.contains("active");
      // Schließe zuerst alle anderen offenen Menüs
      document
        .querySelectorAll(".menu-content.active")
        .forEach((menu) => menu.classList.remove("active"));
      // Öffne das aktuelle Menü, wenn es nicht bereits aktiv war
      if (!isActive) {
        menuContent.classList.add("active");
        menuItems[0]?.focus(); // Setzt Fokus auf das erste Element für Accessibility
      }
    });

    // Keyboard-Navigation für das Menü (Accessibility)
    menuContent.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        menuContent.classList.remove("active");
        menuBtn.focus(); // Fokus zurück zum Button
      }

      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const currentIndex = menuItems.indexOf(document.activeElement);
        let nextIndex;
        if (e.key === "ArrowDown") {
          nextIndex =
            currentIndex < menuItems.length - 1 ? currentIndex + 1 : 0;
        } else {
          // ArrowUp
          nextIndex =
            currentIndex > 0 ? currentIndex - 1 : menuItems.length - 1;
        }
        menuItems[nextIndex]?.focus();
      }
    });

    card.querySelector(".edit-btn").addEventListener("click", (e) => {
      e.preventDefault();
      openTaskModal(null, task);
    });
    card.querySelector(".delete-btn").addEventListener("click", async (e) => {
      e.preventDefault();
      if (confirm("Möchtest du diese Aufgabe wirklich löschen?")) {
        await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
        card.remove();
        updateTaskCounts();
      }
    });
    card
      .querySelector(".duplicate-btn")
      .addEventListener("click", async (e) => {
        e.preventDefault();
        const response = await fetch(`/api/tasks/${task.id}/duplicate`, {
          method: "POST",
        });
        const newTask = await response.json();
        const newTaskElement = createTaskElement(newTask);
        columns[newTask.status].appendChild(newTaskElement);
        initDragAndDropForElement(newTaskElement);
        sortAndReorderTasks(newTask.status);
        updateTaskCounts();
      });

    card
      .querySelectorAll(".subtask input[type='checkbox']")
      .forEach((checkbox) => {
        checkbox.addEventListener("change", async (e) => {
          const index = parseInt(e.target.dataset.index, 10);
          subtasks[index].completed = e.target.checked;
          await fetch(`/api/tasks/${task.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ subtasks: JSON.stringify(subtasks) }),
          });
        });
      });

    return card;
  }

  function updateTaskCounts() {
    for (const status in columns) {
      const columnEl = document.querySelector(
        `.kanban-column[data-status="${status}"]`
      );
      if (columnEl) {
        const count = columns[status].querySelectorAll(".kanban-task").length;
        const countEl = columnEl.querySelector(".task-count");
        if (countEl) countEl.textContent = `${count}`;
      }
    }
  }

  async function sortAndReorderTasks(status, sendToApi = true) {
    const column = columns[status];
    if (!column) return;

    const tasks = Array.from(column.children);
    const priorityOrder = { high: 0, normal: 1, low: 2 };

    tasks.sort(
      (a, b) =>
        (priorityOrder[a.dataset.priority] || 1) -
        (priorityOrder[b.dataset.priority] || 1)
    );

    tasks.forEach((task) => column.appendChild(task));

    if (sendToApi) {
      const taskIds = tasks.map((task) => parseInt(task.dataset.id, 10));
      await fetch("/api/tasks/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, task_ids: taskIds }),
      });
    }
  }

  // --- Drag & Drop ---
  function initDragAndDrop() {
    document
      .querySelectorAll(".kanban-task")
      .forEach(initDragAndDropForElement);
  }

  function initDragAndDropForElement(task) {
    task.addEventListener("dragstart", (e) => {
      draggedTask = task;
      setTimeout(() => task.classList.add("dragging"), 0);
      e.dataTransfer.effectAllowed = "move";
    });

    task.addEventListener("dragend", () => {
      task.classList.remove("dragging");
    });
  }

  Object.values(columns).forEach((column) => {
    column.addEventListener("dragover", (e) => {
      e.preventDefault();
      const afterElement = getDragAfterElement(column, e.clientY);
      if (draggedTask) {
        if (afterElement == null) {
          column.appendChild(draggedTask);
        } else {
          column.insertBefore(draggedTask, afterElement);
        }
      }
    });

    column.addEventListener("drop", async (e) => {
      e.preventDefault();
      if (!draggedTask) return;

      const newStatus = Object.keys(columns).find(
        (key) => columns[key] === column
      );
      const taskId = draggedTask.dataset.id;
      const originalStatus = (
        await (await fetch(`/api/tasks/${taskId}`)).json()
      ).status;

      if (originalStatus !== newStatus) {
        await fetch(`/api/tasks/${taskId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: newStatus }),
        });
      }

      sortAndReorderTasks(newStatus);
      if (originalStatus !== newStatus) {
        sortAndReorderTasks(originalStatus);
      }
      updateTaskCounts();
    });
  });

  function getDragAfterElement(container, y) {
    const draggableElements = [
      ...container.querySelectorAll(".kanban-task:not(.dragging)"),
    ];
    return draggableElements.reduce(
      (closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
          return { offset: offset, element: child };
        } else {
          return closest;
        }
      },
      { offset: Number.NEGATIVE_INFINITY }
    ).element;
  }

  // --- Modal-Logik ---
  function openTaskModal(status = null, taskData = null) {
    taskForm.reset();
    document.getElementById("task-id").value = "";
    document.getElementById("desc-preview").innerHTML = "";
    titleError.classList.remove("visible");

    if (taskData) {
      document.getElementById("task-id").value = taskData.id;
      document.getElementById("task-title").value = taskData.title;
      document.getElementById("task-desc").value = taskData.description || "";
      document.getElementById("task-status").value = taskData.status;
      document.getElementById("task-priority").value = taskData.priority;
      document.getElementById("task-due-date").value = taskData.due_date || "";
      document.getElementById("task-tags").value = taskData.tags || "";
      let subtasks = [];
      try {
        if (taskData.subtasks) subtasks = JSON.parse(taskData.subtasks);
      } catch (e) {}
      document.getElementById("task-subtasks").value = subtasks
        .map((s) => `- [${s.completed ? "x" : " "}] ${s.text}`)
        .join("\n");
    } else {
      if (status) document.getElementById("task-status").value = status;
    }
    updateMarkdownPreview();
    taskModal.classList.remove("hidden");
  }

  function closeModal() {
    taskModal.classList.add("hidden");
  }

  async function handleFormSubmit(e) {
    e.preventDefault();
    const title = document.getElementById("task-title").value.trim();
    if (!title) {
      titleError.classList.add("visible");
      document.getElementById("task-title").focus();
      return;
    }
    titleError.classList.remove("visible");

    const taskId = document.getElementById("task-id").value;
    const subtasks = document
      .getElementById("task-subtasks")
      .value.split("\n")
      .filter((line) => line.trim().length > 0)
      .map((line) => {
        const match = line.match(/^\s*-\s*\[(x| )\]\s*(.*)/);
        return {
          completed: match ? match[1].trim() === "x" : false,
          text: match ? match[2].trim() : line.replace(/^\s*-\s*/, "").trim(),
        };
      });

    const taskData = {
      title: title,
      description: document.getElementById("task-desc").value,
      status: document.getElementById("task-status").value,
      priority: document.getElementById("task-priority").value,
      due_date: document.getElementById("task-due-date").value || null,
      tags: document.getElementById("task-tags").value.trim(),
      subtasks: subtasks,
    };

    const url = taskId ? `/api/tasks/${taskId}` : "/api/tasks";
    const method = taskId ? "PUT" : "POST";

    try {
      const response = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(taskData),
      });
      const savedTask = await response.json();

      if (taskId) {
        const oldCard = document.querySelector(
          `.kanban-task[data-id='${taskId}']`
        );
        if (oldCard) oldCard.remove();
      }

      const newCard = createTaskElement(savedTask);
      columns[savedTask.status].appendChild(newCard);
      initDragAndDropForElement(newCard);
      sortAndReorderTasks(savedTask.status);
      updateTaskCounts();
      closeModal();
    } catch (error) {
      console.error("Fehler beim Speichern:", error);
    }
  }

  function updateMarkdownPreview() {
    const preview = document.getElementById("desc-preview");
    const content = document.getElementById("task-desc").value;
    if (preview) preview.innerHTML = marked.parse(content || "");
  }

  // --- Initialisierung der Event Listeners ---
  function initEventListeners() {
    document.querySelectorAll(".add-task-btn").forEach((button) => {
      button.addEventListener("click", () => {
        openTaskModal(button.dataset.status, null);
      });
    });
    taskForm.addEventListener("submit", handleFormSubmit);
    closeBtn.addEventListener("click", closeModal);
    taskModal.addEventListener("click", (e) => {
      if (e.target === taskModal) closeModal();
    });
    document
      .getElementById("task-desc")
      .addEventListener("input", updateMarkdownPreview);
    darkModeToggle.addEventListener("click", toggleDarkMode);
    window.addEventListener("click", (e) => {
      if (!e.target.closest(".task-menu")) {
        document
          .querySelectorAll(".menu-content.active")
          .forEach((menu) => menu.classList.remove("active"));
      }
    });
  }

  // --- Dark Mode ---
  function toggleDarkMode() {
    const isDark = document.body.classList.toggle("darkmode");
    localStorage.setItem("darkmode", isDark);
    updateDarkModeIcon(isDark);
  }

  function applyInitialTheme() {
    const isDark =
      localStorage.getItem("darkmode") === "true" ||
      (localStorage.getItem("darkmode") === null &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.body.classList.toggle("darkmode", isDark);
    updateDarkModeIcon(isDark);
  }

  function updateDarkModeIcon(isDark) {
    const icon = darkModeToggle.querySelector("i");
    if (icon)
      icon.className = isDark ? "fa-solid fa-sun" : "fa-regular fa-moon";
  }

  // --- Hilfsfunktionen ---
  function escapeHtml(str) {
    const p = document.createElement("p");
    p.appendChild(document.createTextNode(str || ""));
    return p.innerHTML;
  }

  function showSkeletons() {
    Object.values(columns).forEach(
      (col) =>
        (col.innerHTML =
          '<div class="skeleton"></div><div class="skeleton"></div><div class="skeleton"></div>')
    );
  }

  // --- START ---
  applyInitialTheme();
  initEventListeners();
  loadTasks();
});
