import { useState } from "react";
import NavBar from "../components/NavBar";
import FollowingFeed from "../components/FollowingFeed";
import TrendingFeed from "../components/TrendingFeed";

function Home() {
  const [followFeed, setFollowFeed] = useState(false);
  const [trendingFeed, setTrendingFeed] = useState(true);

  function followFeedOn() {
    if (followFeed) return;
    setFollowFeed(true);
    setTrendingFeed(false);
  }

  function trendingFeedOn() {
    if (trendingFeed) return;
    setTrendingFeed(true);
    setFollowFeed(false);
  }

  return (
    <>
      <NavBar />
      <div className="nav bot">
        <button className={`feed-buttons${followFeed ? " active" : ""}`} onClick={followFeedOn}>
          Following
        </button>
        <button
          className={`feed-buttons${trendingFeed ? " active" : ""}`}
          onClick={trendingFeedOn}
        >
          Trending
        </button>
      </div>
      {trendingFeed ? <TrendingFeed /> : <FollowingFeed />}
    </>
  );
}

export default Home;
