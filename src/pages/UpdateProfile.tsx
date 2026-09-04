import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { uploadFile } from "../lib/storage";
import { Link, useNavigate } from "react-router-dom";
import { IoIosArrowBack } from "react-icons/io";

function UpdateProfile() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [image, setImage] = useState<{ file: File; preview: string }>();
  const [bio, setBio] = useState<string>();

  if (user == null) return null;

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const file = e.target.files[0];
    setImage({ file, preview: URL.createObjectURL(file) });
  };

  const handleBioChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setBio(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const updates: { avatar_url?: string; bio?: string } = {};

    if (image) {
      const path = `${user.id}/${image.file.name}`;
      updates.avatar_url = await uploadFile("avatars", path, image.file);
    }
    if (bio) {
      updates.bio = bio;
    }

    if (Object.keys(updates).length > 0) {
      const { error } = await supabase.from("users").update(updates).eq("id", user.id);
      if (error) {
        console.error("Failed to update profile:", error);
        alert("Couldn't update your profile — please try again.");
        return;
      }
    }

    alert("Profile updated!");
    navigate(`/account/${user.id}`);
  };

  return (
    <div>
      <div className="back-arrow">
        <Link to={`/account/${user.id}`}>
          <IoIosArrowBack />
          Account
        </Link>
      </div>
      <form className="form" onSubmit={handleSubmit}>
        <h2>Update Profile</h2>
        <label htmlFor="profile-pic-upload" className="upload-img-button">
          Choose Profile Image
        </label>
        <input id="profile-pic-upload" onChange={handleImageUpload} type="file" />
        {image && <img className="preview-img" src={image.preview} alt="image preview" />}
        <label>Bio: </label>
        <textarea value={bio} onChange={handleBioChange} />
        <button type="submit">Update</button>
      </form>
    </div>
  );
}

export default UpdateProfile;
