import React, { useState,useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../Styles/Login.css";

const Login = () => {
  const [form, setForm] = useState({ identifier: "", password: "" });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
  console.log(token? "tiene token":"No tiene token ");
    setTimeout(() => {
      if (token) {
        navigate("/");
      }
   }, 1000);
  }, [navigate,success]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const res = await fetch("http://localhost:5000/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.identifier, 
          password: form.password,
        }),
      });

      const data = await res.json();
      console.log(data.msg);

      if (!res.ok) throw new Error(data.error || "Error al iniciar sesión");

    
      localStorage.setItem("token", data.token);
      setSuccess("Inicio de sesión correcto");
      setForm({ identifier: "", password: "" });
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="container">
      <form className="form-login" onSubmit={handleSubmit}>
        <h2 className="title-login">Inicio de Sesion</h2>

        

        <div className="form-group">
          <label htmlFor="identifier">Usuario o Email:</label>
          <input
            type="text"
            id="identifier"
            name="identifier"
            placeholder="alex@mail.com"
            value={form.identifier}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="password">Contraseña:</label>
          <input
            type="password"
            id="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            required
          />
        </div>

        <button type="submit">Iniciar Sesion</button>

        <small>
          ¿No tienes una cuenta?{" "}
          <a className="link-register" href="/register">
            Regístrate
          </a>
        </small>
        {error && <p className="error">{error}</p>}
        {success && <p className="success">{success}</p>}
      </form>
        
    </div>
  );
};

export default Login;
