from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from ytmusicapi import YTMusic
import logging
import yt_dlp
import tempfile
import os

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)

yt = YTMusic()


def thumbnail(thumbnails):
    if not thumbnails:
        return ''
    return thumbnails[-1]['url']


@app.route('/api/search', methods=['GET'])
def search():
    query = request.args.get('q', '')
    limit = int(request.args.get('limit', 20))
    if not query:
        return jsonify({'error': 'missing query'}), 400
    results = yt.search(query, limit=limit)
    return jsonify({'results': results})


@app.route('/api/search/songs', methods=['GET'])
def search_songs():
    query = request.args.get('q', '')
    limit = int(request.args.get('limit', 20))
    if not query:
        return jsonify({'error': 'missing query'}), 400
    results = yt.search(query, filter='songs', limit=limit)
    return jsonify({'results': results})


@app.route('/api/search/albums', methods=['GET'])
def search_albums():
    query = request.args.get('q', '')
    limit = int(request.args.get('limit', 10))
    if not query:
        return jsonify({'error': 'missing query'}), 400
    results = yt.search(query, filter='albums', limit=limit)
    return jsonify({'results': results})


@app.route('/api/search/playlists', methods=['GET'])
def search_playlists():
    query = request.args.get('q', '')
    limit = int(request.args.get('limit', 10))
    if not query:
        return jsonify({'error': 'missing query'}), 400
    results = yt.search(query, filter='playlists', limit=limit)
    return jsonify({'results': results})


@app.route('/api/album/<browse_id>', methods=['GET'])
def get_album(browse_id):
    try:
        album = yt.get_album(browse_id)
        return jsonify(album)
    except Exception as e:
        logger.error(f'Failed to get album {browse_id}: {e}')
        return jsonify({'error': str(e)}), 500


@app.route('/api/artist/<browse_id>', methods=['GET'])
def get_artist(browse_id):
    try:
        artist = yt.get_artist(browse_id)
        return jsonify(artist)
    except Exception as e:
        logger.error(f'Failed to get artist {browse_id}: {e}')
        return jsonify({'error': str(e)}), 500


@app.route('/api/playlist/<playlist_id>', methods=['GET'])
def get_playlist(playlist_id):
    try:
        playlist = yt.get_playlist(playlist_id)
        return jsonify(playlist)
    except Exception as e:
        logger.error(f'Failed to get playlist {playlist_id}: {e}')
        return jsonify({'error': str(e)}), 500


@app.route('/api/song/<video_id>', methods=['GET'])
def get_song(video_id):
    try:
        data = yt.get_song(video_id)
        if data.get('playabilityStatus', {}).get('status') == 'OK':
            return jsonify({
                'videoDetails': data.get('videoDetails'),
                'microformat': data.get('microformat'),
            })
        return jsonify({'error': 'not playable'}), 404
    except Exception as e:
        logger.error(f'Failed to get song {video_id}: {e}')
        return jsonify({'error': str(e)}), 500


@app.route('/api/lyrics/check/<video_id>', methods=['GET'])
def check_lyrics(video_id):
    try:
        watch = yt.get_watch_playlist(video_id)
        lyrics_browse_id = watch.get('lyrics')
        return jsonify({'available': bool(lyrics_browse_id)})
    except Exception as e:
        logger.error(f'Failed to check lyrics for {video_id}: {e}')
        return jsonify({'available': False})


@app.route('/api/lyrics/<video_id>', methods=['GET'])
def get_lyrics(video_id):
    try:
        watch = yt.get_watch_playlist(video_id)
        lyrics_browse_id = watch.get('lyrics')
        if not lyrics_browse_id:
            return jsonify({'error': 'no lyrics available'}), 404
        lyrics = yt.get_lyrics(lyrics_browse_id, timestamps=True)
        if not lyrics:
            return jsonify({'error': 'no lyrics available'}), 404
        return jsonify(lyrics)
    except Exception as e:
        logger.error(f'Failed to get lyrics for {video_id}: {e}')
        return jsonify({'error': str(e)}), 500


@app.route('/api/audio/<video_id>', methods=['GET'])
def get_audio_url(video_id):
    try:
        url = f'https://youtube.com/watch?v={video_id}'
        ydl_opts = {
            'format': 'bestaudio[ext=m4a]/bestaudio/best',
            'quiet': True,
            'no_warnings': True,
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=False)
            audio_url = info.get('url')
            if not audio_url:
                for fmt in info.get('formats', []):
                    if fmt.get('acodec') != 'none' and fmt.get('vcodec') == 'none':
                        audio_url = fmt.get('url')
                        break
            if not audio_url:
                return jsonify({'error': 'No audio stream found'}), 404
            return jsonify({
                'url': audio_url,
                'title': info.get('title', ''),
                'duration': info.get('duration', 0),
            })
    except Exception as e:
        logger.error(f'Failed to get audio URL for {video_id}: {e}')
        return jsonify({'error': str(e)}), 500


@app.route('/api/download/<video_id>', methods=['GET'])
def download_song(video_id):
    try:
        url = f'https://youtube.com/watch?v={video_id}'
        tmp = tempfile.NamedTemporaryFile(delete=False, suffix='.mp3')
        tmp.close()

        ydl_opts = {
            'format': 'bestaudio/best',
            'outtmpl': tmp.name.replace('.mp3', ''),
            'postprocessors': [{
                'key': 'FFmpegExtractAudio',
                'preferredcodec': 'mp3',
                'preferredquality': '320',
            }],
            'quiet': True,
            'no_warnings': True,
        }

        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(url, download=True)
            title = info.get('title', 'audio')

        mp3_path = tmp.name.replace('.mp3', '') + '.mp3'
        if not os.path.exists(mp3_path):
            return jsonify({'error': 'Conversion failed'}), 500

        response = send_file(
            mp3_path,
            as_attachment=True,
            download_name=f'{title}.mp3',
            mimetype='audio/mpeg',
        )

        @response.call_on_close
        def cleanup():
            try:
                os.unlink(mp3_path)
            except Exception:
                pass

        return response

    except Exception as e:
        logger.error(f'Download failed for {video_id}: {e}')
        return jsonify({'error': str(e)}), 500


if __name__ == '__main__':
    import os
    port = int(os.environ.get('PORT', 3614))
    app.run(host='0.0.0.0', port=port, debug=True)
