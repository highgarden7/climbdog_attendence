import { useEffect, useState } from "react";
import EmptyState from "../components/EmptyState";
import { listRecentPhotos } from "../services/photoStorage";
import { useCrew } from "../state/CrewContext";
import { formatDate } from "../utils/date";

const PAGE_SIZE = 20;

export default function PhotosPage() {
  const { events } = useCrew();
  const [photos, setPhotos] = useState([]);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadEventSource() {
      setLoading(true);
      setError("");

      try {
        const result = await listRecentPhotos(events, { offset: 0, limit: PAGE_SIZE });
        if (!active) {
          return;
        }

        setPhotos(result.items);
        setHasMore(result.hasMore);
      } catch (nextError) {
        if (active) {
          setError(nextError instanceof Error ? nextError.message : "사진을 불러오지 못했습니다.");
          setPhotos([]);
          setHasMore(false);
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadEventSource();
    return () => {
      active = false;
    };
  }, [events]);

  async function handleLoadMore() {
    setLoadingMore(true);

    try {
      const result = await listRecentPhotos(events, { offset: photos.length, limit: PAGE_SIZE });
      setPhotos((current) => [...current, ...result.items]);
      setHasMore(result.hasMore);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "사진을 더 불러오지 못했습니다.");
    } finally {
      setLoadingMore(false);
    }
  }

  if (loading) {
    return <div className="gallery-message">사진첩을 불러오는 중...</div>;
  }

  if (error) {
    return <div className="gallery-message gallery-message--error">사진첩 오류: {error}</div>;
  }

  if (!photos.length) {
    return <EmptyState icon="🖼" title="아직 사진이 없어요" description="벙개에서 업로드한 인증사진이 여기에 모입니다." />;
  }

  return (
    <>
      <div className="gallery-grid">
        {photos.map((photo) => (
          <button key={photo.key} type="button" className="gallery-card" onClick={() => setSelectedPhoto(photo)}>
            <img src={photo.data} alt="" className="gallery-card__image" />
            <div className="gallery-card__meta">
              <strong>{photo.eventTitle}</strong>
              <span>{formatDate(photo.eventDate)}</span>
            </div>
          </button>
        ))}
      </div>

      {hasMore ? (
        <button type="button" className="gallery-more-button" onClick={handleLoadMore} disabled={loadingMore}>
          {loadingMore ? "불러오는 중..." : "더보기"}
        </button>
      ) : null}

      {selectedPhoto ? (
        <div className="photo-viewer" onClick={() => setSelectedPhoto(null)} role="presentation">
          <img src={selectedPhoto.data} alt="" className="photo-viewer__image" />
          <div className="photo-viewer__meta">
            {selectedPhoto.eventTitle} · {formatDate(selectedPhoto.eventDate)}
          </div>
        </div>
      ) : null}
    </>
  );
}
