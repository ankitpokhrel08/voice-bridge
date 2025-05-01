import { useEffect, useRef } from "react";

function CallTranscribePage() {
  const myVideoRef = useRef(null);

  useEffect(() => {
    async function enableCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        if (myVideoRef.current) {
          myVideoRef.current.srcObject = stream;
        }
      } catch (err) {
        // Handle error (e.g., user denied camera)
        console.error("Error accessing camera:", err);
      }
    }
    enableCamera();
  }, []);

  return (
    <div className="call-transcribe-page flex flex-col items-center justify-center h-screen bg-gray-100">
      <h1 className="text-2xl font-bold mb-4">Call Transcribe Page</h1>
      <div className="video-container relative w-[500px] h-[350px] mb-4">
        {/* Other user's video (main box) */}
        <div className="w-full h-full bg-gray-300 rounded-lg flex items-center justify-center">
          {/* Placeholder for other user's video */}
          <span className="text-gray-500">Other Person's Video</span>
        </div>
        {/* My video (mini box overlay) */}
        <video
          ref={myVideoRef}
          autoPlay
          muted
          className="absolute bottom-4 right-4 w-32 h-24 rounded-lg border-2 border-white shadow-lg object-cover bg-black"
        />
      </div>
      <div className="caption-box w-full max-w-2xl bg-white p-4 rounded-lg shadow-md">
        <h2 className="text-lg font-semibold mb-2">Real-time Captions</h2>
        <div className="captions h-32 overflow-y-auto text-gray-700">
          <p className="text-sm">Captions will appear here...</p>
        </div>
      </div>
    </div>
  );
}

export default CallTranscribePage;
