import React, { useState,useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Signup.css";

const Signup = () => {
  const [form, setForm] = useState({
    name: "",
    username: "",
    email: "",
    password: "",
  });
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
const navigate = useNavigate();
  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    try {
      const res = await fetch("http://127.0.0.1:5000/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      console.log(data.msg);
      if (!res.ok) throw new Error(data.error || "Error al registrar");
      setSuccess("Usuario registrado correctamente");
      setForm({ name: "", username: "", email: "", password: "" });
    } catch (err) {
      setError(err.message);
    }
  };

    useEffect(() => {
   
      if (success) {
        setTimeout(() => {
           navigate("/login");
        }, 1000);
        
      }
    }, [success]);

  return (
    <div className="container">
      <form className="signup-form" onSubmit={handleSubmit}>
        <h2>Registrar</h2>



        <label>
          Nombre Completo:
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            required
          />
        </label>

        <label>
          Nombre de Usuario:
          <input
            type="text"
            name="username"
            value={form.username}
            onChange={handleChange}
            required
          />
        </label>

        <label>
          Correo:
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            required
          />
        </label>

        <label>
          Contraseña:
          <input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            required
          />
        </label>

        <button type="submit">Register</button>

        <small className="btn-login">
          ¿Ya tienes una cuenta? <a href="/login">Iniciar sesión</a>
        </small>
        {error && <p className="error">{error}</p>}
        {success && <p className="success">{success}</p>}
      </form>
    </div>
  );
};

export default Signup;
