import av
import os
import time

def merge_with_ffmpeg(video_path, audio_path):
    """
    Merges video and audio using PyAV (av) library.
    Bypasses the need for a separate ffmpeg binary.
    """
    timestamp = int(time.time())
    output_file = f"final_output_{timestamp}.mp4"
    print(f"  Muxing: {video_path} + {audio_path} -> {output_file}")
    
    try:
        # Open inputs
        v_container = av.open(video_path)
        a_container = av.open(audio_path)
        
        # Create output
        o_container = av.open(output_file, 'w')
        
        v_stream = v_container.streams.video[0]
        a_stream = a_container.streams.audio[0]
        
        # Add output video stream
        ov_stream = o_container.add_stream(v_stream.codec_context.name, rate=v_stream.average_rate)
        ov_stream.width = v_stream.width
        ov_stream.height = v_stream.height
        ov_stream.pix_fmt = v_stream.pix_fmt
        
        # Add output audio stream
        oa_stream = o_container.add_stream('aac', rate=a_stream.rate)
        
        # Transcode video (remuxing is tricky with pts/dts, so we transcode for safety)
        for packet in v_container.demux(v_stream):
            for frame in packet.decode():
                for packet in ov_stream.encode(frame):
                    o_container.mux(packet)
                    
        # Flush video
        for packet in ov_stream.encode():
            o_container.mux(packet)
            
        # Transcode audio
        for packet in a_container.demux(a_stream):
            for frame in packet.decode():
                for packet in oa_stream.encode(frame):
                    o_container.mux(packet)
                    
        # Flush audio
        for packet in oa_stream.encode():
            o_container.mux(packet)
            
        o_container.close()
        v_container.close()
        a_container.close()
        
        print(f"  Muxing successful!")
        return output_file
        
    except Exception as e:
        print(f"  Muxing failed: {e}")
        # Standard fallback if internal merge fails
        return video_path
