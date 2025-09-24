import React, { useEffect, useState } from "react";
import "../Styles/TodoList.css";

const TaskList = ({ user }) => {
  const [NuevaTarea, setNuevaTarea] = useState("");
  const [list, setList] = useState([]);
  const [editTaskId, setEditTaskId] = useState(null);
  const [editLabel, setEditLabel] = useState("");

  const fetchTasks = async () => {
    try {
      const response = await fetch("http://localhost:5000/tasks", {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setList(data || []);
      } else {
        console.error("Error obteniendo tareas:", response.statusText);
      }
    } catch (error) {
      console.error("Fetch error:", error);
    }
  };

  const addTask = async () => {
    if (!NuevaTarea.trim()) return;

    try {
      const response = await fetch("http://localhost:5000/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user}`,
        },
        body: JSON.stringify({ label: NuevaTarea }),
      });

      if (response.ok) {
        setNuevaTarea("");
        fetchTasks();
      } else {
        console.error("Error agregando tarea:", response.statusText);
      }
    } catch (error) {
      console.error("Fetch error:", error);
    }
  };

  const deleteTask = async (id) => {
    try {
      const response = await fetch(`http://localhost:5000/tasks/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${user}` },
      });
      if (response.ok) {
        setList(list.filter((t) => t.id !== id));
      } else {
        console.error("Error borrando tarea:", response.statusText);
      }
    } catch (error) {
      console.error("Fetch error:", error);
    }
  };

  const updateTask = async (id, label = null, completed = null) => {
    try {
      const payload = {};
      if (label !== null) payload.label = label;
      if (completed !== null) payload.completed = completed;

      const response = await fetch(`http://localhost:5000/tasks/${id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        fetchTasks();
        setEditTaskId(null);
        setEditLabel("");
      } else {
        console.error("Error actualizando tarea:", response.statusText);
      }
    } catch (error) {
      console.error("Fetch error:", error);
    }
  };

  const handleKeyDownAdd = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTask();
    }
  };

  const handleKeyDownEdit = (e, id) => {
    if (e.key === "Enter") {
      e.preventDefault();
      updateTask(id, editLabel);
    }
  };

  const toggleCompleted = (task) => {
    updateTask(task.id, null, !task.completed);
  };

  useEffect(() => {
    if (user) fetchTasks();
  }, [user]);

  return (
    <div className="contenedor-card">
      <h2 className="text-center text-secondary my-3">Lista de Tareas</h2>
      <div className="paper d-flex flex-column justify-content-center align-items-start">
        <input
          className="input-tarea"
          type="text"
          value={NuevaTarea}
          onChange={(e) => setNuevaTarea(e.target.value)}
          onKeyDown={handleKeyDownAdd}
          placeholder="Añadir tarea..."
        />
        <hr />

        <div className="name-container">
        <span>Id</span>
        <span>ESTADO</span>
        <span>TAREA</span>
        <span>ACCIONES</span>
        </div>
        <ul>
          {list.length === 0 ? (
            
            <>
              <li className="pb-2">No hay tareas, añadir tareas</li>
              <hr />
            </>
          ) : (
            list.map((element, index) => (
              
              <li key={element.id} className="tarea-item">
                 <div className="div-checkbox"> 
                 {index + 1} <span> - </span> 
                <input
                  type="checkbox"
                  checked={element.completed}
                  onChange={() => toggleCompleted(element)}
                  className="checkbox-completado"
                /> 
                {element.completed ? "Completada" : "Pendiente"}
                </div>
                {editTaskId === element.id ? (
                  <input
                    type="text"
                    value={editLabel}
                    onChange={(e) => setEditLabel(e.target.value)}
                    onKeyDown={(e) => handleKeyDownEdit(e, element.id)}
                    onBlur={() => updateTask(element.id, editLabel)}
                    autoFocus
                    className="input-editar"
                  />
                ) : (
                  <span
                    className={element.completed ? "completado" : ""}
                    onDoubleClick={() => {
                      setEditTaskId(element.id);
                      setEditLabel(element.label);
                    }}
                  >
                    {element.label}
                  </span>
                )}

                <span>
                <span
                  className="actualizar-icono"
                  onClick={() => {
                    setEditTaskId(element.id);
                    setEditLabel(element.label);
                  }}
                  title="Editar"
                >
                  🖉
                </span>
                <span
                  className="Borrar-icono"
                  onClick={() => deleteTask(element.id)}
                  title="Eliminar"
                >
                  🗑
                </span></span>
              </li>
            ))
          )}
        </ul>
        <hr />
        <p className="footer-text">
          {list.length} Tarea{list.length !== 1 ? "s" : ""} Restantes
        </p>
      </div>
    </div>
  );
};

export default TaskList;
