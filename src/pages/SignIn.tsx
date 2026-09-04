import NavBar from "../components/NavBar";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useState } from "react";

function SignIn() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ email: "", password: "" });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: formData.email,
      password: formData.password,
    });
    if (error) {
      alert("Incorrect email or password");
      return;
    }
    alert("Welcome back, " + (data.user.user_metadata.display_name ?? data.user.email) + "!");
    setFormData({ email: "", password: "" });
    navigate("/");
  };

  return (
    <>
      <NavBar />
      <form className="form" onSubmit={handleSubmit}>
        <h2>Sign In</h2>
        <input
          id="email"
          className="form-input"
          name="email"
          type="email"
          value={formData.email}
          placeholder="Enter Email"
          onChange={handleChange}
          required
        ></input>
        <input
          id="password"
          className="form-input"
          name="password"
          value={formData.password}
          type="password"
          placeholder="Enter Password"
          onChange={handleChange}
          required
        ></input>
        <input type="submit" value="Sign In"></input>
        <p>
          Not registered yet? <Link to="/signup">Sign Up</Link>
        </p>
      </form>
    </>
  );
}

export default SignIn;
