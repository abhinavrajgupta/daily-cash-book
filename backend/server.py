from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import psycopg2
import psycopg2.extras
from datetime import date
from loans import loan_bp

app = Flask(__name__)
CORS(app)  # allow your static frontend
app.register_blueprint(loan_bp)

DATABASE_URL = os.environ.get("DATABASE_URL")

def get_conn():
    return psycopg2.connect(DATABASE_URL, cursor_factory=psycopg2.extras.RealDictCursor)

USER_ID = 1  # your father

@app.route("/api/entries", methods=["GET"])
def list_entries():
    entry_date = request.args.get("date")
    if not entry_date:
        return jsonify({"error": "date parameter required"}), 400

    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT id, date, type, category, amount, note, created_at
            FROM entries
            WHERE user_id = %s AND date = %s
            ORDER BY created_at
            """,
            (USER_ID, entry_date),
        )
        rows = cur.fetchall()
    return jsonify(rows)

@app.route("/api/entries", methods=["POST"])
def create_entry():
    data = request.get_json(force=True)
    required = ["date", "type", "category", "amount"]
    if not all(k in data and data[k] for k in required):
        return jsonify({"error": "Missing required fields"}), 400

    entry_date = data["date"]
    entry_type = data["type"]
    category = data["category"]
    amount = float(data["amount"])
    note = data.get("note")

    if entry_type not in ("income", "expense") or amount <= 0:
        return jsonify({"error": "Invalid type or amount"}), 400

    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO entries (user_id, date, type, category, amount, note)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING id, date, type, category, amount, note, created_at
            """,
            (USER_ID, entry_date, entry_type, category, amount, note),
        )
        row = cur.fetchone()
    return jsonify(row), 201

@app.route("/api/entries/<int:entry_id>", methods=["PUT"])
def update_entry(entry_id):
    data = request.get_json(force=True)
    entry_date = data.get("date")
    entry_type = data.get("type")
    category = data.get("category")
    amount = data.get("amount")
    note = data.get("note")

    if not entry_date or not entry_type or not category or not amount:
        return jsonify({"error": "Missing required fields"}), 400

    amount = float(amount)
    if entry_type not in ("income", "expense") or amount <= 0:
        return jsonify({"error": "Invalid type or amount"}), 400

    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            """
            UPDATE entries
            SET date = %s, type = %s, category = %s, amount = %s, note = %s
            WHERE id = %s AND user_id = %s
            RETURNING id, date, type, category, amount, note, created_at
            """,
            (entry_date, entry_type, category, amount, note, entry_id, USER_ID),
        )
        row = cur.fetchone()
        if not row:
            return jsonify({"error": "Not found"}), 404
    return jsonify(row)

@app.route("/api/entries/<int:entry_id>", methods=["DELETE"])
def delete_entry(entry_id):
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute(
            "DELETE FROM entries WHERE id = %s AND user_id = %s",
            (entry_id, USER_ID),
        )
        if cur.rowcount == 0:
            return jsonify({"error": "Not found"}), 404
    return jsonify({"status": "ok"})

@app.route("/api/summary", methods=["GET"])
def summary():
    from_date = request.args.get("from")
    to_date = request.args.get("to")

    if not from_date or not to_date:
        return jsonify({"error": "from and to parameters required"}), 400

    with get_conn() as conn, conn.cursor() as cur:
        # totals
        cur.execute(
            """
            SELECT
              COALESCE(SUM(CASE WHEN type = 'income' THEN amount END), 0) AS income_total,
              COALESCE(SUM(CASE WHEN type = 'expense' THEN amount END), 0) AS expense_total
            FROM entries
            WHERE user_id = %s AND date BETWEEN %s AND %s
            """,
            (USER_ID, from_date, to_date),
        )
        totals = cur.fetchone()

        # by category
        cur.execute(
            """
            SELECT
              category,
              COALESCE(SUM(CASE WHEN type = 'income' THEN amount END), 0) AS income_total,
              COALESCE(SUM(CASE WHEN type = 'expense' THEN amount END), 0) AS expense_total
            FROM entries
            WHERE user_id = %s AND date BETWEEN %s AND %s
            GROUP BY category
            ORDER BY category
            """,
            (USER_ID, from_date, to_date),
        )
        by_category = cur.fetchall()

    result = {
        "income_total": float(totals["income_total"]),
        "expense_total": float(totals["expense_total"]),
        "net": float(totals["income_total"] - totals["expense_total"]),
        "by_category": [
            {
                "category": row["category"],
                "income_total": float(row["income_total"]),
                "expense_total": float(row["expense_total"]),
            }
            for row in by_category
        ],
    }
    return jsonify(result)

if __name__ == "__main__":
    app.run(debug=True)
