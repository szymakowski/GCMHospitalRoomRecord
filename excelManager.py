import pandas as pd

EXCEL_PATH = 'GCMDataBase.xlsx'

def load_excel_sheet(sheet_name: str):
    return pd.read_excel(EXCEL_PATH, sheet_name=sheet_name, engine='openpyxl')

if __name__ == '__main__':

    print(load_excel_sheet('departments'))
    print(load_excel_sheet('workers'))
    print(load_excel_sheet('rooms'))