class StreamManager {
  private activeStreams = new Map<string, MediaStream>();
  private activeOwners = new Set<string>();

  // Acquire media stream with mutual exclusion
  async acquire(kind: 'audio' | 'video', constraints: MediaStreamConstraints, owner: string): Promise<MediaStream> {
    // Teardown previous streams for kind to enforce mutual exclusion
    this.releaseAll();

    // Cancel speech synthesis read-aloud before starting mic to avoid hearing itself
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    this.activeStreams.set(owner, stream);
    this.activeOwners.add(owner);

    // Track ended listener (e.g. device unplugged or permission revoked)
    stream.getTracks().forEach((track) => {
      track.addEventListener('ended', () => {
        console.warn(`[StreamManager] Track ${track.kind} ended unexpectedly (device unplugged or revoked).`);
        this.release(owner);
      });
    });

    return stream;
  }

  // Release specific owner stream
  release(owner: string) {
    const stream = this.activeStreams.get(owner);
    if (stream) {
      stream.getTracks().forEach((track) => {
        track.stop();
      });
      this.activeStreams.delete(owner);
      this.activeOwners.delete(owner);
    }
  }

  // Release all active streams (clean teardown)
  releaseAll() {
    for (const [owner, stream] of this.activeStreams.entries()) {
      stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
    }
    this.activeStreams.clear();
    this.activeOwners.clear();
  }

  hasActiveStream(): boolean {
    return this.activeStreams.size > 0;
  }
}

export const streamManager = new StreamManager();

// Global exit handlers to ensure camera/mic indicators always turn off
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => streamManager.releaseAll());
  window.addEventListener('pagehide', () => streamManager.releaseAll());
}
