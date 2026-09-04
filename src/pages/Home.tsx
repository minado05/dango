import { useState } from "react";
import NavBar from "../components/NavBar";
import FollowingFeed from "../components/FollowingFeed";
import ExploreFeed from "../components/ExploreFeed";
import TrendingFeed from "../components/TrendingFeed";

type Tab = "following" | "explore" | "trending";

function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("explore");

  return (
    <>
      <NavBar />
      <div className="nav bot">
        <button
          className={`feed-buttons${activeTab === "following" ? " active" : ""}`}
          onClick={() => setActiveTab("following")}
        >
          Following
        </button>
        <button
          className={`feed-buttons${activeTab === "explore" ? " active" : ""}`}
          onClick={() => setActiveTab("explore")}
        >
          Explore
        </button>
        <button
          className={`feed-buttons${activeTab === "trending" ? " active" : ""}`}
          onClick={() => setActiveTab("trending")}
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
