export default function Home() {
  return (
    <div className="homeWrapper">
      <img src="/images/top-corner.png" className="cornerImage topLeft" alt="" />
      <img src="/images/bottom-corner.png" className="cornerImage bottomRight" alt="" />

      <div className="textBlock">
        <div className="myText">My</div>
        <div className="journal">Stories</div>
        <div className="author">Michael Alan Bond</div>
      </div>
    </div>
  );
}