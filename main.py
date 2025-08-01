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
    df = load_excel_sheet('departments')
    result = df.to_dict(orient='records')
    result = [entity['departmentName'] for entity in result]
    return jsonify(result)

@app.route('/api/rooms')
def api_rooms():
    selected_departments = request.args.getlist('departments')
    df = load_excel_sheet('rooms')

    if selected_departments:
        df = df[df['department'].isin(selected_departments)]

    room_labels = [
        f"{row['roomBuilding'].upper()}-PIĘTRO{row['roomFloor']}-POKÓJ{row['roomNumber']}"
        for _, row in df.iterrows()
    ]
    print(room_labels)
    return jsonify(room_labels)


@app.route('/api/rooms_all')
def api_rooms_all():
    df = load_excel_sheet("rooms")

    result = []
    for _, row in df.iterrows():
        result.append({
            "Budynek": str(row.get("roomBuilding", "") or ""),
            "Numer pokoju": str(row.get("roomNumber", "") or ""),
            "Piętro": str(row.get("roomFloor", "") or ""),
            "Dział": str(row.get("department", "") or ""),
            "Typ pokoju": str(row.get("roomType", "") or ""),
            "Liczba stanowisk": str(row.get("numberOfSeats", "") or ""),
            "Dostępność dla pacjentów": str(row.get("isForPatient", "") or ""),
            "Dostępność gazu": str(row.get("isGas", "") or ""),
            "Czy posiada okno": str(row.get("isWindow", "") or ""),
        })

    return jsonify(result)

@app.route('/api/employees_all')
def api_employee_info():
    df = load_excel_sheet('workers')

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
    departments_df = load_excel_sheet("departments")
    rooms_df = load_excel_sheet("rooms")
    employees_df = load_excel_sheet("workers")

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

    filtered = df[
        (df["roomNumber"] == int(number)) &
        (df["roomFloor"] == int(floor)) &
        (df["roomBuilding"].str.upper() == building.upper())
    ]

    if filtered.empty:
        return jsonify({
            "roomNumber": '',
            "department": '',
            "roomType": '',
            "numberOfSeats": '',
            "isForPatient": False,
            "isGas": False,
            "isWindow": False
        })

    room = filtered.iloc[0]
    return jsonify({
        "roomNumber": int(room["roomNumber"]) if pd.notna(room["roomNumber"]) else "",
        "department": str(room["department"]) if pd.notna(room["department"]) else "",
        "roomType": str(room["roomType"]) if pd.notna(room["roomType"]) else "",
        "numberOfSeats": int(room["numberOfSeats"]) if pd.notna(room["numberOfSeats"]) else "",
        "isForPatient": bool(room["isForPatient"]) if pd.notna(room["isForPatient"]) else False,
        "isGas": bool(room["isGas"]) if pd.notna(room["isGas"]) else False,
        "isWindow": bool(room["isWindow"]) if pd.notna(room["isWindow"]) else False,
    })

@app.route('/api/free_rooms')
def api_free_rooms():
    df = load_excel_sheet("rooms")

    # Filtracja pokoi bez przypisanego działu
    free_rooms_df = df[(df["department"].isnull()) | (df["department"] == "")]

    result = []
    for _, room in free_rooms_df.iterrows():
        result.append({
            "Budynek": str(room.get("roomBuilding", "") or ""),
            "Numer pokoju": int(room["roomNumber"]) if pd.notna(room["roomNumber"]) else "",
            "Piętro": int(room["roomFloor"]) if pd.notna(room["roomFloor"]) else "",
            "Dział": str(room.get("department", "") or ""),
            "Typ pokoju": str(room.get("roomType", "") or ""),
            "Liczba stanowisk": int(room["numberOfSeats"]) if pd.notna(room["numberOfSeats"]) else "",
            "Dostępność dla pacjentów": bool(room.get("isForPatient", False)),
            "Dostępność gazu": bool(room.get("isGas", False)),
            "Czy posiada okno": bool(room.get("isWindow", False)),
        })
    return jsonify(result)


if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5000, debug=False, use_reloader=False)