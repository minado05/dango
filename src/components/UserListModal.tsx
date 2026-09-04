import { useNavigate } from "react-router-dom";

export interface UserListItem {
  id: string;
  display_name: string;
  avatar_url: string;
}

interface Props {
  title: string;
  users: UserListItem[];
  onClose: () => void;
}

function UserListModal({ title, users, onClose }: Props) {
  const navigate = useNavigate();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="modal-list">
          {users.length === 0 && <p>No one here yet.</p>}
          {users.map((listUser) => (
            <div
              key={listUser.id}
              className="modal-list-item"
              onClick={() => {
                onClose();
                navigate(`/account/${listUser.id}`);
              }}
            >
              <img src={listUser.avatar_url} className="post-profile-circle" />
              <div>{listUser.display_name}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default UserListModal;
