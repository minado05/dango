import heroImg from "../assets/hero.png";
import SearchBar from "../components/SearchBar";

function Home() {
  return (
    <section id="home">
      <img src={heroImg} alt="" className="hero-img" />
      <h1>Dango</h1>
      <p>Discover restaurant itineraries shared by the community.</p>
      <SearchBar />
    </section>
  );
}

export default Home;
