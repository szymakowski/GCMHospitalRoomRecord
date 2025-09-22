from flask import Flask, render_template, jsonify, request
import sqlite3
import pandas as pd
from excelManager import load_excel_sheet

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

@app.route('/harmonogram_pokoi.html')
def calendar_page():
    return render_template('reservation_page.html')

@app.route('/baza_danych_pomieszczenia.html')
def database_rooms():
    return render_template('rooms_table.html')

@app.route('/baza_danych_pracownicy.html')
def database_employees():
    return render_template('employees_table.html')

@app.route('/baza_danych_działy.html')
def database_departments():
    return render_template('departments_table.html')

@app.route('/wolne_miejsca.html')
def free_rooms_page():
    return render_template('free_rooms.html')

@app.route('/api/departments')
def api_departments():
    df = load_excel_sheet('departments').fillna("")
    result = df.to_dict(orient='records')
    result = [entity['departmentName'] for entity in result]
    return jsonify(result)

@app.route('/api/rooms')
def api_rooms():
    selected_departments = request.args.getlist('departments')
    df = load_excel_sheet('rooms').fillna("")

    if selected_departments:
        df = df[df['department'].isin(selected_departments)]

    room_labels = [
        f"{row['roomBuilding'].upper()}.{row['roomFloor']}.{int(row['roomNumber']):02d}"
        + (f" - {row['roomName']}" if pd.notna(row['roomName']) else "")
        for _, row in df.iterrows()
    ]
    print(room_labels)
    return jsonify(room_labels)

@app.route('/api/rooms_all')
def api_rooms_all():
    df = load_excel_sheet("rooms").fillna("")

    result = []
    for _, row in df.iterrows():
        result.append({
            "Budynek": str(row.get("roomBuilding", "")),
            "Numer pokoju": str(row.get("roomNumber", "")),
            "Piętro": str(row.get("roomFloor", "")),
            "Nazwa pokoju": str(row.get("roomName", "")),
            "Dział": str(row.get("department", "")),
            "Typ pokoju": str(row.get("roomType", "")),
            "Liczba stanowisk": str(row.get("numberOfSeats", "")),
            "Powierzchnia pokoju": str(row.get("area", "")),
            "Dostępność dla pacjentów": str(row.get("isForPatient", "")),
            "Dostępność gazu": str(row.get("isGas", "")),
            "Czy posiada okno": str(row.get("isWindow", "")),
        })

    return jsonify(result)

@app.route('/api/employees_all')
def api_employee_info():
    df = load_excel_sheet('workers').fillna("")

    result = [{
        "domainName":employee['domainName'],
        "name":employee['name'],
        "surname":employee['surname'],
        "email":employee['email'],
        "department":employee['department'],
        "roomId":employee['roomId']
    } for _,employee in df.iterrows()]
    return jsonify(result)

@app.route('/api/departments_all')
def api_departments_all():
    departments_df = load_excel_sheet("departments").fillna("")
    rooms_df = load_excel_sheet("rooms").fillna("")
    employees_df = load_excel_sheet("workers").fillna("")

    # Liczenie pokoi i pracowników dla każdego działu
    room_counts = rooms_df['department'].value_counts()
    employee_counts = employees_df['department'].value_counts()

    result = []

    for _, row in departments_df.iterrows():
        dept_name = row['departmentName']
        result.append({
            "departmentAbbreviation": row['departmentAbbreviation'],
            "departmentName": dept_name,
            "numberOfRooms": int(room_counts.get(dept_name, 0)),
            "numberOfEmployees": int(employee_counts.get(dept_name, 0))
        })

    return jsonify(result)


@app.route('/api/room_info')
def api_room_info():
    number = request.args.get("number")
    floor = request.args.get("floor")
    building = request.args.get("building")

    if not all([number, floor, building]):
        return jsonify({"error": "Brak wymaganych parametrów"}), 400

    df = load_excel_sheet("rooms")
    dfw = load_excel_sheet("workers")

    filtered = []
    for temprow in df.iterrows():
        row = temprow[1]
        if (int(row["roomNumber"]) == int(number) and
            str(row["roomFloor"]) == str(floor) and
            str(row["roomBuilding"]) == str(building)):
            filtered.append(row)
    print(filtered)

    filtered_workers = []
    for workers_row in dfw.iterrows():
        worker = workers_row[1]
        if worker['roomId'] == str(building) + '.' + str(floor) + '.' + str(number):
            filtered_workers.append(worker)


    if not filtered:
        return jsonify({
            "roomNumber": '',
            "roomName": '',
            "department": '',
            "roomType": '',
            "numberOfSeats": '',
            "workers": '',
        })

    room = filtered[0]
    workers = [str(i['name'] + ' ' + i['surname']) for i in filtered_workers]
    print(workers)

    return jsonify({
        "roomNumber": str(room["roomNumber"]).zfill(2) if pd.notna(room["roomNumber"]) else "",
        "roomFloor": str(room["roomFloor"]) if pd.notna(room["roomFloor"]) else "",
        "roomBuilding": str(room["roomBuilding"]) if pd.notna(room["roomBuilding"]) else "",
        "roomName": str(room["roomName"]) if pd.notna(room["roomName"]) else "",
        "department": str(room["department"]) if pd.notna(room["department"]) else "",
        "roomType": str(room["roomType"]) if pd.notna(room["roomType"]) else "",
        "numberOfSeats": int(room["numberOfSeats"]) if pd.notna(room["numberOfSeats"]) else "",
        "isForPatient": str(room["isForPatient"]) if pd.notna(room["isForPatient"]) else "",
        "workers": workers if workers else ""
    })

@app.route('/api/free_rooms')
def api_free_rooms():
    df = load_excel_sheet("rooms")
    df = df.fillna("")

    free_rooms_df = df[
        ((df["department"] == "") & (df["roomName"] == ""))
    ]

    result = []
    for _, room in free_rooms_df.iterrows():
        result.append({
            "Budynek": room.get("roomBuilding", ""),
            "Numer pokoju": room.get("roomNumber", ""),
            "Piętro": int(room["roomFloor"]) if str(room["roomFloor"]).isdigit() else "",
            "Dział": room.get("department", ""),
            "Typ pokoju": room.get("roomType", ""),
            "Liczba stanowisk": int(room["numberOfSeats"]) if str(room["numberOfSeats"]).isdigit() else "",
            "Powierzchnia pokoju": room.get("area", ""),
            "Dostępność gazu": room.get("isGas", "")
        })

    return jsonify(result)


if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5000, debug=False, use_reloader=False)