import csv
from io import StringIO, BytesIO
import pandas as pd


def export_to_csv(data: list[dict]):

    if not data:
        return ""

    output = StringIO()
    writer = csv.DictWriter(output, fieldnames=data[0].keys())
    writer.writeheader()
    writer.writerows(data)

    return output.getvalue()


def export_to_xlsx(data: list[dict]):

    df = pd.DataFrame(data)

    output = BytesIO()
    df.to_excel(output, index=False, engine="openpyxl")

    output.seek(0)
    return output
