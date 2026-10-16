TV opening bitrate optimization of ../tv-v104/tour.mp4.
Opening: CRF 24, 900 kbps VBV maxrate/buffer; all 245 frames at 480x1040/30 fps.
Every later video packet and the entire AAC track are copied without re-encoding.
Original timestamps, chapter timing, Golden Rules and full safety ending retained.
Rebuild: python3 scripts/build-tv-opening.py
Verify: python3 tests/verify-tv-media.py
Music license: ../audio/BGM_CREDITS.txt
