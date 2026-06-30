from flask import Flask, request, jsonify
from flask_cors import CORS
from ytmusicapi import YTMusic
import logging

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


@app.route('/api/search/artists', methods=['GET'])
def search_artists():
    query = request.args.get('q', '')
    limit = int(request.args.get('limit', 10))
    if not query:
        return jsonify({'error': 'missing query'}), 400
    results = yt.search(query, filter='artists', limit=limit)
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


if __name__ == '__main__':
    import os
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)
