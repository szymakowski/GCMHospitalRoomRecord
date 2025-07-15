from flask import Flask, render_template, jsonify, request
import sqlite3


app = Flask(__name__)

@app.route('/')
def campus():
    return render_template('campus.html')

@app.route('/plan_szpitala/<filename>')
def mapa(filename):
    return render_template('building_map.html',
                           svg_file=filename)

@app.route('/statystyki.html')
def stats_page():
    return render_template('statistics.html')

@app.route('/rezerwacja_sali.html')
def room_reservation_page():
    return render_template('room_reservation_page.html')

@app.route('/bazy_danych.html')
def database_page():
    return render_template('database_page.html')

@app.route('/api/departments')
def api_departments():
    conn = sqlite3.connect('GCMDataBase.db')
    cursor = conn.cursor()
    cursor.execute("SELECT departmentName FROM department")
    departments = [row[0] for row in cursor.fetchall()]
    conn.close()
    return jsonify(departments)

@app.route('/api/rooms')
def api_rooms():
    selected_departments = request.args.getlist('departments')

    conn = sqlite3.connect('GCMDataBase.db')
    cursor = conn.cursor()

    if selected_departments:
        placeholders = ','.join('?' for _ in selected_departments)
        query = f"SELECT roomNumber FROM room WHERE department IN ({placeholders})"
        cursor.execute(query, selected_departments)
    else:
        cursor.execute("SELECT roomNumber FROM room")

    rooms = [row[0] for row in cursor.fetchall()]
    conn.close()
    return jsonify(rooms)


if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5000, debug=False, use_reloader=False)