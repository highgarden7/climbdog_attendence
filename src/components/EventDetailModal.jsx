import { useEffect, useRef, useState } from "react";
import { formatDate, isToday } from "../utils/date";
import Modal from "./Modal";

export default function EventDetailModal({
  event,
  myName,
  photoUploading,
  photoVersion,
  getPhotos,
  onClose,
  onToggleRsvp,
  onCheckIn,
  onUploadPhoto,
  onDelete,
}) {
  const fileInputRef = useRef(null);
  const [photos, setPhotos] = useState([]);
  const [loadingPhotos, setLoadingPhotos] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadPhotos() {
      setLoadingPhotos(true);
      const nextPhotos = await getPhotos(event.id);
      if (active) {
        setPhotos(nextPhotos);
        setLoadingPhotos(false);
      }
    }

    loadPhotos();
    return () => {
      active = false;
    };
  }, [event.id, photoVersion, getPhotos]);

  const joined = event.rsvp.includes(myName);
  const checkedIn = event.checkin.includes(myName);
  const isEventToday = isToday(event.date);
  const hasPhotos = photos.length > 0;

  return (
    <>
      <Modal title={event.title} onClose={onClose}>
        <div className="detail-row">📅 {formatDate(event.date)}</div>
        {event.location ? <div className="detail-row">📍 {event.location}</div> : null}
        {event.note ? <div className="detail-row">📝 {event.note}</div> : null}
        <div className="detail-row">👤 만든이: {event.createdBy}</div>

        <section className="detail-section">
          <div className="detail-section__title">
            📸 단체사진 ({photos.length}장)
            {!hasPhotos ? <span className="detail-section__hint">출석 체크에 필요!</span> : null}
          </div>

          {loadingPhotos ? <div className="detail-section__message">불러오는 중...</div> : null}

          {!loadingPhotos && photos.length > 0 ? (
            <div className="photo-grid">
              {photos.map((photo, index) => (
                <button key={`${photo.at}-${index}`} type="button" className="photo-thumb" onClick={() => setSelectedPhoto(photo)}>
                  <img src={photo.data} alt="" className="photo-thumb__image" />
                  <span className="photo-thumb__by">{photo.by}</span>
                </button>
              ))}
            </div>
          ) : null}

          {!loadingPhotos && photos.length === 0 ? (
            <div className="detail-section__message">사진을 먼저 올려야 출석 체크가 가능해요!</div>
          ) : null}

          {myName ? (
            <>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(eventInput) => {
                  const file = eventInput.target.files?.[0];
                  if (file) {
                    onUploadPhoto(event.id, file);
                  }
                }}
              />
              <button type="button" className="upload-button" onClick={() => fileInputRef.current?.click()} disabled={photoUploading}>
                {photoUploading ? "업로드 중..." : "📷 사진 올리기"}
              </button>
            </>
          ) : null}
        </section>

        <section className="detail-section">
          <div className="detail-section__title">참가 신청 ({event.rsvp.length}명)</div>
          <div className="name-cloud">
            {event.rsvp.length === 0 ? <span className="detail-section__message">아직 없어요</span> : null}
            {event.rsvp.map((name) => (
              <span key={name} className={`name-tag ${event.checkin.includes(name) ? "is-checked" : ""}`}>
                {name}
                {event.checkin.includes(name) ? " ✓" : ""}
              </span>
            ))}
          </div>

          {myName ? (
            <div className="detail-actions">
              <button type="button" className={`action-button ${joined ? "is-danger" : ""}`} onClick={() => onToggleRsvp(event.id)}>
                {joined ? "참가 취소" : "참가할게요!"}
              </button>

              {isEventToday && joined ? (
                <button
                  type="button"
                  className={`action-button ${checkedIn ? "is-done" : hasPhotos ? "is-primary" : "is-disabled"}`}
                  onClick={() => onCheckIn(event.id)}
                  disabled={checkedIn}
                >
                  {checkedIn ? "출석 완료 ✓" : hasPhotos ? "출석 체크" : "📷 사진 필요"}
                </button>
              ) : null}
            </div>
          ) : null}
        </section>

        <div className="modal-footer">
          {confirmDelete ? (
            <div className="modal-footer__confirm">
              <span>정말 삭제?</span>
              <button type="button" className="small-button is-danger" onClick={() => onDelete(event.id)}>
                삭제
              </button>
              <button type="button" className="small-button" onClick={() => setConfirmDelete(false)}>
                취소
              </button>
            </div>
          ) : (
            <button type="button" className="text-button" onClick={() => setConfirmDelete(true)}>
              벙개 삭제
            </button>
          )}
        </div>
      </Modal>

      {selectedPhoto ? (
        <div className="photo-viewer" onClick={() => setSelectedPhoto(null)} role="presentation">
          <img src={selectedPhoto.data} alt="" className="photo-viewer__image" />
          <div className="photo-viewer__meta">
            {selectedPhoto.by} · {new Date(selectedPhoto.at).toLocaleDateString("ko")}
          </div>
        </div>
      ) : null}
    </>
  );
}
