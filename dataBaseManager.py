import sqlite3
from werkzeug.security import generate_password_hash


class SQLiteManager:
    def __init__(self, db_name="GCMDataBase.db"):
        self.db_name = db_name
        self.connection = sqlite3.connect(self.db_name)
        self.cursor = self.connection.cursor()
        self.create_worker_table()
        self.create_room_table()
        self.create_department_table()

    def create_worker_table(self):
        with sqlite3.connect(self.db_name):
            self.cursor.execute('''
                CREATE TABLE IF NOT EXISTS worker (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    domainName TEXT,
                    name TEXT,
                    surname TEXT,
                    email TEXT,
                    department TEXT,
                    roomId TEXT,
                    notes TEXT)
                ''')
            self.connection.commit()

    def create_department_table(self):
        with sqlite3.connect(self.db_name):
            self.cursor.execute('''
                CREATE TABLE IF NOT EXISTS department (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    departmentAbbreviation TEXT,
                    departmentName TEXT)
                ''')
            self.connection.commit()

    def create_room_table(self):
        with sqlite3.connect(self.db_name):
            self.cursor.execute('''
                CREATE TABLE IF NOT EXISTS room (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    roomNumber TEXT,
                    roomFloor TEXT,
                    roomBuilding TEXT,
                    department TEXT,
                    roomType TEXT,
                    localization TEXT,
                    area TEXT,
                    numberOfSeats TEXT,
                    isForPatient BOOL,
                    isGas BOOL,
                    isWindow BOOL,
                    notes TEXT)
                ''')
        self.connection.commit()

    def drop_department_table(self):
        with sqlite3.connect(self.db_name):
            self.cursor.execute("DROP TABLE IF EXISTS department")
            self.connection.commit()

    def add_worker(self,
                   domainName:str,
                   name:str,
                   surname:str,
                   email:str,
                   department:str,
                   roomId:str,
                   notes:str) -> bool:
        try:
            sql_query = ("INSERT INTO worker"
                         "(domainName, name, surname, email, "
                         "department, roomId, notes) "
                         "VALUES (?, ?, ?, ?, ?, ?, ?)")

            self.cursor.execute(sql_query,
                                [domainName, name, surname, email, department, roomId, notes])
            self.connection.commit()
            return True

        except sqlite3.Error as e:
            print(f'Error: sqlite3 during adding worker to database: {e}')
            return False

        except Exception as e:
            print(f'Error: during adding worker to database: {e}')
            return False

    def add_room(self,
                   roomNumber:str,
                   roomFloor:str,
                   roomBuilding:str,
                   department:str,
                   roomType:str,
                   localization:str,
                   area:str,
                   numberOfSeats:str,
                   isForPatient:str,
                   isGas:str,
                   isWindow:str,
                   notes:str) -> bool:
        try:
            sql_query = ("INSERT INTO room"
                         "(roomNumber, roomFloor, roomBuilding, department, roomType, localization, "
                         "area, numberOfSeats, isForPatient, isGas, isWindow, notes) "
                         "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")

            self.cursor.execute(sql_query,
                                [roomNumber, roomFloor, roomBuilding, department,
                                 roomType, localization, area, numberOfSeats, isForPatient,
                                 isGas, isWindow, notes])
            self.connection.commit()
            return True

        except sqlite3.Error as e:
            print(f'Error: sqlite3 during adding room to database: {e}')
            return False

        except Exception as e:
            print(f'Error: during adding room to database: {e}')
            return False

    def add_department(self,
                   departmentAbbreviation:str, departmentName:str) -> bool:
        try:
            sql_query = ("INSERT INTO department"
                         "(departmentAbbreviation, departmentName) "
                         "VALUES (?, ?)")

            self.cursor.execute(sql_query,
                                [departmentAbbreviation, departmentName])
            self.connection.commit()
            return True

        except sqlite3.Error as e:
            print(f'Error: sqlite3 during adding department to database: {e}')
            return False

        except Exception as e:
            print(f'Error: during adding department to database: {e}')
            return False

    def delete_worker(self, domainName:str) -> bool:
        try:
            sql_query = ("DELETE FROM worker WHERE domainName = ?")
            self.cursor.execute(sql_query, (domainName,))
            self.connection.commit()

            if self.cursor.rowcount() == 0:
                print(f"Brak użytkownika: {domainName} w bazie danych")
                return False

            print(f"Użytkownik '{domainName}' został usunięty")
            return True

        except sqlite3.Error as e:
            print(f'Wrror: sqlite3 during deleting user {domainName}, : {e}')
            return False

        except Exception as e:
            print(f'Error during deleting user {domainName}, : {e}')
            return False

    def delete_department(self, departmentName):
        try:
            sql_query = ("DELETE FROM department WHERE departmentName = ?")
            self.cursor.execute(sql_query, (departmentName,))
            self.connection.commit()

            if self.cursor.rowcount() == 0:
                print(f"Brak działu: {departmentName} w bazie danych")
                return False

            print(f"Dział '{departmentName}' został usunięty")
            return True

        except sqlite3.Error as e:
            print(f'Wrror: sqlite3 during deleting department {departmentName}, : {e}')
            return False

        except Exception as e:
            print(f'Error during deleting department {departmentName}, : {e}')
            return False

    def get_all_workers(self):
        self.cursor.execute('SELECT * FROM worker')
        results = self.cursor.fetchall()
        print("Zawartość tabeli 'WORKER':")
        print("-" * 60)

        for row in results:
            print(row)
        print("-" * 60)

        return results

    def get_all_departments(self):
        self.cursor.execute('SELECT * FROM department')
        results = self.cursor.fetchall()
        print("Zawartość tabeli 'DEPARTMENT':")
        print("-" * 60)

        for row in results:
            print(row)
        print("-" * 60)

        return results

    def get_all_rooms(self):
        self.cursor.execute('SELECT * FROM room')
        results = self.cursor.fetchall()
        print("Zawartość tabeli 'ROOM':")
        print("-" * 60)

        for row in results:
            print(row)
        print("-" * 60)

        return results


if __name__ == '__main__':
    db_manager = SQLiteManager()
    # db_manager.connection.cursor().execute("DROP TABLE IF EXISTS room")
    # db_manager.connection.commit()
    # db_manager.create_room_table()

    # db_manager.cursor.execute("DELETE FROM room")
    # db_manager.connection.commit()
    # db_manager.delete_department(str('Ambulatorium Badań Klinicznych'))
    # db_manager.add_department('LCZ', 'Śląskie Centrum Chorób Zakaźnych - Część Ambulatoryjna')
    db_manager.add_room(
                   roomNumber='175',
                   roomFloor='1',
                   roomBuilding='GOK',
                   department='',
                   roomType='',
                   localization='GOK-1',
                   area='7',
                   numberOfSeats='1',
                   isForPatient='Nie',
                   isGas='Nie',
                   isWindow='Nie',
                   notes='')