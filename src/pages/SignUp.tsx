import NavBar from "../components/NavBar";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useState } from "react";

interface FormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

function SignUp() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState<FormData>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState<Partial<FormData>>({});

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validate = () => {
    const newErrors: Partial<FormData> = {};
    if (formData.password.length < 6) {
      newErrors.password = "Password should be at least 6 characters or longer";
    }
    if (formData.password != formData.confirmPassword)
      newErrors.confirmPassword = "Passwords do not match";
    return newErrors;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const { error } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
      options: {
        data: { display_name: formData.name },
      },
    });

    if (error) {
      if (error.message.toLowerCase().includes("registered")) {
        setErrors({ email: "This email is already in use" });
      } else {
        setErrors({ email: error.message });
      }
      return;
    }

    navigate("/");
    alert("Account created successfully!");
    setFormData({ name: "", email: "", password: "", confirmPassword: "" });
    setErrors({});
  };

  return (
    <>
      <NavBar />
      <form className="form" onSubmit={handleSubmit}>
        <h2>Sign Up</h2>
        <input
          className="form-input"
          name="name"
          value={formData.name}
          type="text"
          onChange={handleChange}
          placeholder="Name"
          required
        />
        <input
          className="form-input"
          name="email"
          value={formData.email}
          type="email"
          onChange={handleChange}
          placeholder="Enter Email"
          required
        />
        {errors.email && <p style={{ color: "red" }}>{errors.email}</p>}

        <input
          className="form-input"
          name="password"
          value={formData.password}
          type="password"
          onChange={handleChange}
          placeholder="Enter Password"
          required
        />
        {errors.password && <p style={{ color: "red" }}>{errors.password}</p>}

        <input
          className="form-input"
          name="confirmPassword"
          value={formData.confirmPassword}
          type="password"
          placeholder="Confirm Password"
          onChange={handleChange}
          required
        />

        {errors.confirmPassword && <p style={{ color: "red" }}>{errors.confirmPassword}</p>}

        <input type="submit" value="Sign Up" />
        <p>
          Already a member? <Link to="/signin">Sign In</Link>
        </p>
      </form>
    </>
  );
}

export default SignUp;
