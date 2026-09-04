import { IoIosArrowBack } from "react-icons/io";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import MyPosts from "../components/MyPosts";
import Saved from "../components/Saved";
import type { User } from "../types";

function Account() {
  const { user } = useAuth();
  const params = useParams<{ profileId: string }>();
  const profileId = params.profileId;
  const [isSaved, setIsSaved] = useState(false);
  const [profile, setProfile] = useState<User | null>(null);
  const navigate = useNavigate();

  const isUser = user != null && profileId != null && user.id === profileId;

  useEffect(() => {
    if (!profileId) return;
    const getProfile = async () => {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", profileId)
        .maybeSingle();
      if (error) {
        console.error("Failed to load profile:", error);
        return;
      }
      setProfile(data);
    };
    getProfile();
  }, [profileId]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    alert("Sign out successful!");
    navigate("/signin");
  };

  const handleFollow = async () => {
    if (user == null) {
      alert("Please sign in to follow!");
      return;
    }
    if (profileId == null) return;
    const { error } = await supabase
      .from("follows")
      .insert({ follower_id: user.id, followed_id: profileId });
    if (error) {
      console.error("Failed to follow:", error);
      alert("Couldn't follow this user right now.");
      return;
    }
    alert("Follow successful!");
  };

  const toggleSaved = () => {
    if (!isSaved) setIsSaved(true);
  };

  const toggleMyPosts = () => {
    if (isSaved) setIsSaved(false);
  };

  return (
    <>
      <div className="back-arrow" onClick={() => navigate("/")}>
        <IoIosArrowBack />
        Home
      </div>
      <div id="profile-banner">
        <div id="profile-wrap">
          <img src={profile?.avatar_url} className="profile-circle" />
          <div className="description">
            <div id="name">Name: {profile?.display_name}</div>
            <div id="userid">Dango ID: {profileId ? profileId : ""}</div>
            <div id="bio">Bio: {profile?.bio} </div>
            {isUser ? (
              <button onClick={() => navigate("/updateprofile")}>Update Profile</button>
            ) : (
              <button onClick={handleFollow}>Follow</button>
            )}
          </div>
        </div>
        {isUser && (
          <button id="sign-out-button" onClick={handleSignOut}>
            Sign out
          </button>
        )}
      </div>
      <hr></hr>
      <div className="nav bot">
        <button onClick={toggleMyPosts} className={`feed-buttons${!isSaved ? " active" : ""}`}>
          My Posts
        </button>
        <button onClick={toggleSaved} className={`feed-buttons${isSaved ? " active" : ""}`}>
          Saved
        </button>
      </div>
      {isSaved ? <Saved profileId={profileId || ""} /> : <MyPosts profileId={profileId || ""} />}
    </>
  );
}
export default Account;
