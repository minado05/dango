import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import NavBar from "../components/NavBar";
import FollowingFeed from "../components/FollowingFeed";
import ExploreFeed from "../components/ExploreFeed";
import TrendingFeed from "../components/TrendingFeed";
import { useAuth } from "../lib/auth";

type Tab = "following" | "explore" | "trending";

function Home() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("trending");
  const [hasSetDefault, setHasSetDefault] = useState(false);

  // Wait for auth to resolve before picking the default tab, so a signed-in
  // user doesn't briefly get defaulted to Trending before their session
  // loads. Only runs once — never overrides a tab you've manually picked.
  useEffect(() => {
    if (loading || hasSetDefault) return;
    setActiveTab(user ? "explore" : "trending");
    setHasSetDefault(true);
  }, [loading, user, hasSetDefault]);

  const handleTabClick = (tab: Tab) => {
    if (tab !== "trending" && user == null) {
      alert("Please sign in to access this feature!");
      navigate("/signin");
      return;
    }
    setActiveTab(tab);
  };

  return (
    <>
      <NavBar />
      <div className="nav bot">
        <button
          className={`feed-buttons${activeTab === "following" ? " active" : ""}`}
          onClick={() => handleTabClick("following")}
        >
          Following
        </button>
        <button
          className={`feed-buttons${activeTab === "explore" ? " active" : ""}`}
          onClick={() => handleTabClick("explore")}
        >
          Explore
        </button>
        <button
          className={`feed-buttons${activeTab === "trending" ? " active" : ""}`}
          onClick={() => handleTabClick("trending")}
        >
          Trending
        </button>
      </div>
      {activeTab === "following" && <FollowingFeed />}
      {activeTab === "explore" && <ExploreFeed />}
      {activeTab === "trending" && <TrendingFeed />}
    </>
  );
}

export default Home;
