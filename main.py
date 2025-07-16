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
        query = f"""
            SELECT roomNumber, roomFloor, roomBuilding
            FROM room
            WHERE department IN ({placeholders})
        """
        cursor.execute(query, selected_departments)
    else:
        cursor.execute("SELECT roomNumber, roomFloor, roomBuilding FROM room")

    rooms = [
        f"{row[2].upper()}-PIĘTRO{row[1]}-POKÓJ{row[0]}"
        for row in cursor.fetchall()
    ]
    conn.close()
    return jsonify(rooms)

@app.route('/api/room_info')
def api_room_info():
    room_number = request.args.get('number')
    room_floor = request.args.get('floor')
    room_building = request.args.get('building')

    if not all([room_number, room_floor, room_building]):
        return jsonify({"error": "Brak wymaganych parametrów do wyświetlenia informacji o pokoju"}), 400

    conn = sqlite3.connect('GCMDataBase.db')
    cursor = conn.cursor()
    query = """
        SELECT roomNumber, department, roomType, numberOfSeats, isForPatient, isGas, isWindow 
        FROM room
        WHERE roomNumber = ? AND roomFloor = ? AND roomBuilding = ?
    """
    cursor.execute(query, (room_number, room_floor, room_building))
    result = cursor.fetchone()
    print(result)
    conn.close()

    if result:
        roomNumber, department, roomType, numberOfSeats, isForPatient, isGas, isWindow = result
        return jsonify({
            "roomNumber": roomNumber if roomNumber is not None else "",
            "department": department if department is not None else "",
            "roomType": roomType if roomType is not None else "",
            "numberOfSeats": numberOfSeats if numberOfSeats is not None else "",
            "isForPatient": isForPatient if isForPatient is not None else "",
            "isGas": isGas if isGas is not None else "",
            "isWindow": isWindow if isWindow is not None else ""
        })
    else:
        return jsonify({
            "roomNumber": '',
            "department": '',
            "roomType": '',
            "numberOfSeats": '',
            "isForPatient": '',
            "isGas": '',
            "isWindow": ''
        })


if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5000, debug=False, use_reloader=False)