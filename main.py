from flask import Flask, render_template, jsonify
import sqlite3


app = Flask(__name__)

@app.route('/api/departments')
def api_departments():
    conn = sqlite3.connect('GCMDataBase.db')
    cursor = conn.cursor()
    cursor.execute("SELECT departmentName FROM department")
    departments = [row[0] for row in cursor.fetchall()]
    conn.close()
    # departments = ["Kardiologia", "Ortopedia", "Pediatria"]
    return jsonify(departments)

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



if __name__ == '__main__':
    app.run(debug=True)