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
    return render_template('databases.html')

@app.route('/baza_danych_pomieszczenia.html')
def database_rooms():
    return render_template('rooms_table.html')

@app.route('/baza_danych_pracownicy.html')
def database_employees():
    return render_template('employees_table.html')

@app.route('/baza_danych_działy.html')
def database_departments():
    return render_template('departments_table.html')

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

@app.route('/api/rooms_all')
def api_rooms_all():
    conn = sqlite3.connect('GCMDataBase.db')
    cursor = conn.cursor()
    query = """
        SELECT roomNumber, roomBuilding, roomFloor, department, roomType,
        numberOfSeats, isForPatient, isGas, isWindow 
        FROM room
    """
    cursor.execute(query)
    rooms = cursor.fetchall()
    conn.close()

    result = [
        {
            "Budynek": room[1],
            "Numer pokoju": room[0],
            "Piętro": room[2],
            "Dział": room[3],
            "Typ pokoju": room[4],
            "Liczba stanowisk": room[5],
            "Dostępność dla pacjentów": room[6],
            "Dostępność gazu": room[7],
            "Czy posiada okno": room[8],
        } for room in rooms]

    return jsonify(result)

@app.route('/api/employees_all')
def api_employee_info():
    conn = sqlite3.connect('GCMDataBase.db')
    cursor = conn.cursor()
    query = """
            SELECT domainName,name, surname, email, department, roomId
            FROM worker
    """
    cursor.execute(query)
    employees = cursor.fetchall()

    result = [{
        "domainName":employee[0],
        "name":employee[1],
        "surname":employee[2],
        "email":employee[3],
        "department":employee[4],
        "roomId":employee[5]
    } for employee in employees]

    return jsonify(result)

@app.route('/api/departments_all')
def api_departments_all():
    conn = sqlite3.connect('GCMDataBase.db')
    cursor = conn.cursor()
    query = """
    SELECT departmentAbbreviation, departmentName FROM department
    """

    query_department_rooms = """
    SELECT department FROM room
    """

    query_department_employees = """
    SELECT department FROM worker
    """

    cursor.execute(query)
    departments = cursor.fetchall()

    cursor.execute(query_department_rooms)
    rooms = cursor.fetchall()

    cursor.execute(query_department_employees)
    employees = cursor.fetchall()

    number_of_rooms_by_department = {room: rooms.count(room)
                                     for room in set(rooms)}

    number_of_employees_by_department ={employee: employees.count(employee)
                                        for employee in set(employees)}

    result = [{"departmentAbbreviation":department[0],
               "departmentName":department[1],
               "numberOfRooms": number_of_rooms_by_department.get((department[1],),0),
               "numberOfEmployees": number_of_employees_by_department.get((department[1],),0),
               } for department in departments]

    return jsonify(result)


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