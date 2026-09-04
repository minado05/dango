import { IoIosArrowBack } from "react-icons/io";
import { useNavigate, useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import MyPosts from "../components/MyPosts";
import Saved from "../components/Saved";
import UserListModal, { type UserListItem } from "../components/UserListModal";
import type { User } from "../types";

type ModalType = "following" | "followers" | null;

function Account() {
  const { user } = useAuth();
  const params = useParams<{ profileId: string }>();
  const profileId = params.profileId;
  const [isSaved, setIsSaved] = useState(false);
  const [profile, setProfile] = useState<User | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followingCount, setFollowingCount] = useState(0);
  const [followerCount, setFollowerCount] = useState(0);
  const [savesReceived, setSavesReceived] = useState(0);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [modalUsers, setModalUsers] = useState<UserListItem[]>([]);
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

  useEffect(() => {
    if (user == null || profileId == null || isUser) {
      setIsFollowing(false);
      return;
    }
    const checkFollowing = async () => {
      const { data } = await supabase
        .from("follows")
        .select("follower_id")
        .eq("follower_id", user.id)
        .eq("followed_id", profileId)
        .maybeSingle();
      setIsFollowing(data != null);
    };
    checkFollowing();
  }, [user, profileId, isUser]);

  useEffect(() => {
    if (!profileId) return;
    const getStats = async () => {
      const [{ count: following }, { count: followers }, { data: posts }] = await Promise.all([
        supabase
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("follower_id", profileId),
        supabase
          .from("follows")
          .select("*", { count: "exact", head: true })
          .eq("followed_id", profileId),
        supabase.from("posts").select("save_count").eq("user_id", profileId),
      ]);
      setFollowingCount(following ?? 0);
      setFollowerCount(followers ?? 0);
      setSavesReceived((posts ?? []).reduce((total, post) => total + post.save_count, 0));
    };
    getStats();
  }, [profileId]);

  const openFollowingModal = async () => {
    if (!profileId) return;
    const { data, error } = await supabase
      .from("follows")
      .select("followed:users!followed_id(id, display_name, avatar_url)")
      .eq("follower_id", profileId);
    if (error) {
      console.error("Failed to load following list:", error);
      return;
    }
    const rows = (data as unknown as { followed: UserListItem }[]) ?? [];
    setModalUsers(rows.map((row) => row.followed));
    setModalType("following");
  };

  const openFollowersModal = async () => {
    if (!profileId) return;
    const { data, error } = await supabase
      .from("follows")
      .select("follower:users!follower_id(id, display_name, avatar_url)")
      .eq("followed_id", profileId);
    if (error) {
      console.error("Failed to load followers list:", error);
      return;
    }
    const rows = (data as unknown as { follower: UserListItem }[]) ?? [];
    setModalUsers(rows.map((row) => row.follower));
    setModalType("followers");
  };

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

    if (isFollowing) {
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("followed_id", profileId);
      if (error) {
        console.error("Failed to unfollow:", error);
        alert("Couldn't unfollow this user right now.");
        return;
      }
      setIsFollowing(false);
      setFollowerCount((prev) => Math.max(0, prev - 1));
      return;
    }

    const { error } = await supabase
      .from("follows")
      .insert({ follower_id: user.id, followed_id: profileId });
    if (error) {
      console.error("Failed to follow:", error);
      alert("Couldn't follow this user right now.");
      return;
    }
    setIsFollowing(true);
    setFollowerCount((prev) => prev + 1);
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
              <button onClick={handleFollow}>{isFollowing ? "Unfollow" : "Follow"}</button>
            )}
            <div className="profile-stats">
              <span className="profile-stat-link" onClick={openFollowingModal}>
                {followingCount} Following
              </span>
              <span className="profile-stat-link" onClick={openFollowersModal}>
                {followerCount} Followers
              </span>
              <span>{savesReceived} Saves</span>
            </div>
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
      {modalType && (
        <UserListModal
          title={modalType === "following" ? "Following" : "Followers"}
          users={modalUsers}
          onClose={() => setModalType(null)}
        />
      )}
    </>
  );
}
export default Account;
