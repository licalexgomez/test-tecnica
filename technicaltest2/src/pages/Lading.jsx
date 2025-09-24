import React from "react";
import '../Landing.css'
import TaskList from "./Task";

const Landing = () => {
let token = localStorage.getItem("token");
  if(token){
    return <TaskList user={token} />
  }

  return (<>
    {token ? <TaskList user={token} /> :


    
    <div className="landing-container">
      <h1>Bienvenido a la Gestion de tareas!!!</h1>
      <p>Necesita estar Logeado para comenzar.</p>
    </div>
    }</>
  );
};

export default Landing;