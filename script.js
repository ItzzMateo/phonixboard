const columns = ["todo", "inprogress", "done"];

columns.forEach((id) => {
  const el = document.getElementById(id);
  new Sortable(el, {
    group: "kanban",
    animation: 150,
    onSort: saveTasks,
  });
});

function addTask(columnId) {
  const text = prompt("Aufgabe eingeben:");
  if (!text) return;

  const task = document.createElement("div");
  task.className = "task";
  task.textContent = text;
  document.getElementById(columnId).appendChild(task);
  saveTasks();
}

function saveTasks() {
  const data = {};
  columns.forEach((id) => {
    const tasks = [...document.getElementById(id).children].map(
      (task) => task.textContent
    );
    data[id] = tasks;
  });
  localStorage.setItem("kanban", JSON.stringify(data));
}

function loadTasks() {
  const data = JSON.parse(localStorage.getItem("kanban"));
  if (!data) return;

  columns.forEach((id) => {
    const container = document.getElementById(id);
    container.innerHTML = "";
    data[id].forEach((text) => {
      const task = document.createElement("div");
      task.className = "task";
      task.textContent = text;
      container.appendChild(task);
    });
  });
}

loadTasks();
