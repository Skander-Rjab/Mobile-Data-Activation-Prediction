import csv

input_file = "CIBLE_STAGE_JUN_2026_LV.csv"      # Your semicolon-separated file
output_file = "output.csv"    # The resulting comma-separated CSV

with open(input_file, "r", encoding="utf-8", newline="") as infile, \
     open(output_file, "w", encoding="utf-8", newline="") as outfile:

    reader = csv.reader(infile, delimiter=";")
    writer = csv.writer(outfile, delimiter=",")

    for row in reader:
        # Remove leading/trailing spaces from each field
        cleaned_row = [field.strip() for field in row]
        writer.writerow(cleaned_row)

print(f"Converted '{input_file}' to '{output_file}'.")