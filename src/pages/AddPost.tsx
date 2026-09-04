import { useEffect, useState } from "react";
import NavBar from "../components/NavBar";
import { AiOutlineCloseSquare } from "react-icons/ai";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { uploadFile } from "../lib/storage";
import { fetchLocations } from "../lib/locations";
import { embedText } from "../lib/embeddings";
import type { Location } from "../types";

const AddPost = () => {
  const { user } = useAuth();
  const [images, setImages] = useState<{ file: File; preview: string }[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [locationId, setLocationId] = useState("");
  const [caption, setCaption] = useState("");

  useEffect(() => {
    fetchLocations()
      .then(setLocations)
      .catch(() => setLocations([]));
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const file = e.target.files[0];
    setImages([...images, { file, preview: URL.createObjectURL(file) }]);
    e.target.value = ""; //reset input, allows for duplicate files
  };

  const handleCaptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCaption(e.target.value);
  };

  const handleLocationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setLocationId(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault(); //prevent form reloads
    if (!user) return;
    if (!locationId) {
      alert("Please select a city");
      return;
    }

    const { data: post, error: postError } = await supabase
      .from("posts")
      .insert({
        user_id: user.id,
        location_id: Number(locationId),
        caption,
      })
      .select()
      .single();

    if (postError || !post) {
      console.error("Failed to create post:", postError);
      alert("Couldn't create the post — please try again.");
      return;
    }

    // Best-effort: if this fails, the post still exists, it just won't show
    // up in semantic search results until re-saved or backfilled.
    if (caption.trim()) {
      const embedding = await embedText(caption);
      if (embedding) {
        const { error: embeddingError } = await supabase
          .from("posts")
          .update({ embedding })
          .eq("id", post.id);
        if (embeddingError) {
          console.error("Failed to save embedding:", embeddingError);
        }
      }
    }

    try {
      let position = 0;
      for (const image of images) {
        const path = `${user.id}/${post.id}/${image.file.name}`;
        const url = await uploadFile("post-images", path, image.file);
        const { error: imageError } = await supabase
          .from("post_images")
          .insert({ post_id: post.id, url, position });
        if (imageError) throw imageError;
        position += 1;
      }
    } catch (error) {
      console.error("Failed to upload images:", error);
      alert("Post created, but some images failed to upload.");
    }

    alert("Post uploaded successful!");
    setImages([]);
    setCaption("");
    setLocationId("");
  };

  return (
    <div id="post-form-container">
      <NavBar />
      <form id="post-form" onSubmit={handleSubmit}>
        <h1>Add Post</h1>
        <label htmlFor="image-upload" className="upload-img-button">
          Choose Images
        </label>
        <input id="image-upload" type="file" onChange={handleImageUpload} />
        <div className="images-container">
          {images.map((image, i) => {
            return (
              <div key={i}>
                <div className="image-topbar">
                  <div
                    className="delete-img"
                    onClick={() => {
                      setImages(images.filter((storedImage) => storedImage != image));
                    }}
                  >
                    <AiOutlineCloseSquare />
                  </div>
                  <div>{i + 1}</div>
                </div>
                <img className="preview-img" src={image.preview} alt={`image ${i} preview`} />
              </div>
            );
          })}
        </div>
        <label>Add location: </label>
        <select value={locationId} onChange={handleLocationChange}>
          <option value="">Select a city</option>
          {locations.map((location) => (
            <option key={location.id} value={location.id}>
              {location.city}
            </option>
          ))}
        </select>
        <label>Add Caption: </label>
        <textarea className="caption" value={caption} onChange={handleCaptionChange} />
        <button type="submit">upload</button>
      </form>
    </div>
  );
};

export default AddPost;
