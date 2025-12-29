"""Loan Management API Endpoints"""
from flask import Blueprint, request, jsonify
import psycopg2.extras
from datetime import date, timedelta
from decimal import Decimal

loan_bp = Blueprint('loans', __name__)

# Helper to get DB connection (import this from server.py or define here)
def get_conn():
    import os
    import psycopg2
    DATABASE_URL = os.environ.get("DATABASE_URL")
    return psycopg2.connect(DATABASE_URL, cursor_factory=psycopg2.extras.RealDictCursor)

USER_ID = 1  # Default user

# ============================================
# LOANS GIVEN ENDPOINTS
# ============================================

@loan_bp.route("/api/loans-given", methods=["GET"])
def list_loans_given():
    """Get all loans given with payment details"""
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("""
            SELECT 
                lg.id, lg.borrower_name, lg.amount, lg.due_date, 
                lg.reminder_date, lg.status, lg.notes, lg.created_at,
                COALESCE(SUM(lgp.amount_paid), 0) as total_paid
            FROM loans_given lg
            LEFT JOIN loan_given_payments lgp ON lg.id = lgp.loan_id
            WHERE lg.user_id = %s
            GROUP BY lg.id
            ORDER BY lg.due_date
        """, (USER_ID,))
        loans = cur.fetchall()
        
        # Convert Decimal to float for JSON
        for loan in loans:
            loan['amount'] = float(loan['amount'])
            loan['total_paid'] = float(loan['total_paid'])
            loan['remaining'] = loan['amount'] - loan['total_paid']
        
        return jsonify(loans)

@loan_bp.route("/api/loans-given", methods=["POST"])
def create_loan_given():
    """Create a new loan given record"""
    data = request.get_json(force=True)
    
    required = ["borrower_name", "amount", "due_date"]
    if not all(k in data for k in required):
        return jsonify({"error": "Missing required fields"}), 400
    
    # Calculate reminder date (1 week before due date)
    due_date = data["due_date"]
    reminder_date = data.get("reminder_date")
    if not reminder_date:
        from datetime import datetime
        due_dt = datetime.strptime(due_date, "%Y-%m-%d")
        reminder_dt = due_dt - timedelta(days=7)
        reminder_date = reminder_dt.strftime("%Y-%m-%d")
    
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("""
            INSERT INTO loans_given 
            (user_id, borrower_name, amount, due_date, reminder_date, status, notes)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id, borrower_name, amount, due_date, reminder_date, status, notes, created_at
        """, (
            USER_ID, 
            data["borrower_name"], 
            float(data["amount"]),
            due_date,
            reminder_date,
            data.get("status", "pending"),
            data.get("notes")
        ))
        row = cur.fetchone()
        row['amount'] = float(row['amount'])
        return jsonify(row), 201

@loan_bp.route("/api/loans-given/<int:loan_id>", methods=["PUT"])
def update_loan_given(loan_id):
    """Update loan given details"""
    data = request.get_json(force=True)
    
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("""
            UPDATE loans_given
            SET borrower_name = %s, amount = %s, due_date = %s, 
                reminder_date = %s, status = %s, notes = %s
            WHERE id = %s AND user_id = %s
            RETURNING id, borrower_name, amount, due_date, reminder_date, status, notes
        """, (
            data.get("borrower_name"),
            float(data.get("amount")),
            data.get("due_date"),
            data.get("reminder_date"),
            data.get("status"),
            data.get("notes"),
            loan_id,
            USER_ID
        ))
        row = cur.fetchone()
        if not row:
            return jsonify({"error": "Not found"}), 404
        row['amount'] = float(row['amount'])
        return jsonify(row)

@loan_bp.route("/api/loans-given/<int:loan_id>/payments", methods=["GET"])
def get_loan_payments(loan_id):
    """Get all payments for a specific loan"""
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("""
            SELECT id, loan_id, payment_month, amount_paid, payment_date, notes
            FROM loan_given_payments
            WHERE loan_id = %s
            ORDER BY payment_month
        """, (loan_id,))
        payments = cur.fetchall()
        
        for payment in payments:
            payment['amount_paid'] = float(payment['amount_paid'])
        
        return jsonify(payments)

@loan_bp.route("/api/loans-given/<int:loan_id>/payments", methods=["POST"])
def record_loan_payment(loan_id):
    """Record a payment for a loan given"""
    data = request.get_json(force=True)
    
    required = ["payment_month", "amount_paid"]
    if not all(k in data for k in required):
        return jsonify({"error": "Missing required fields"}), 400
    
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("""
            INSERT INTO loan_given_payments 
            (loan_id, payment_month, amount_paid, payment_date, notes)
            VALUES (%s, %s, %s, %s, %s)
            ON CONFLICT (loan_id, payment_month) 
            DO UPDATE SET 
                amount_paid = EXCLUDED.amount_paid,
                payment_date = EXCLUDED.payment_date,
                notes = EXCLUDED.notes
            RETURNING id, loan_id, payment_month, amount_paid, payment_date, notes
        """, (
            loan_id,
            data["payment_month"],
            float(data["amount_paid"]),
            data.get("payment_date", str(date.today())),
            data.get("notes")
        ))
        row = cur.fetchone()
        row['amount_paid'] = float(row['amount_paid'])
        return jsonify(row), 201

# ============================================
# LOANS TO PAY ENDPOINTS
# ============================================

@loan_bp.route("/api/loans-to-pay", methods=["GET"])
def list_loans_to_pay():
    """Get all loans to pay"""
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("""
            SELECT id, lender_name, original_principal, current_principal, 
                   interest_rate, due_date, status, notes, created_at
            FROM loans_to_pay
            WHERE user_id = %s
            ORDER BY status, due_date
        """, (USER_ID,))
        loans = cur.fetchall()
        
        for loan in loans:
            loan['original_principal'] = float(loan['original_principal'])
            loan['current_principal'] = float(loan['current_principal'])
            loan['interest_rate'] = float(loan['interest_rate'])
        
        return jsonify(loans)

@loan_bp.route("/api/loans-to-pay", methods=["POST"])
def create_loan_to_pay():
    """Create a new loan to pay record"""
    data = request.get_json(force=True)
    
    required = ["lender_name", "original_principal", "interest_rate"]
    if not all(k in data for k in required):
        return jsonify({"error": "Missing required fields"}), 400
    
    principal = float(data["original_principal"])
    
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("""
            INSERT INTO loans_to_pay 
            (user_id, lender_name, original_principal, current_principal, 
             interest_rate, due_date, status, notes)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING id, lender_name, original_principal, current_principal, 
                      interest_rate, due_date, status, notes, created_at
        """, (
            USER_ID,
            data["lender_name"],
            principal,
            principal,  # current_principal starts equal to original
            float(data["interest_rate"]),
            data.get("due_date"),
            data.get("status", "active"),
            data.get("notes")
        ))
        row = cur.fetchone()
        row['original_principal'] = float(row['original_principal'])
        row['current_principal'] = float(row['current_principal'])
        row['interest_rate'] = float(row['interest_rate'])
        return jsonify(row), 201

@loan_bp.route("/api/loans-to-pay/<int:loan_id>/payments", methods=["GET"])
def get_loan_to_pay_payments(loan_id):
    """Get payment history for a loan to pay"""
    with get_conn() as conn, conn.cursor() as cur:
        cur.execute("""
            SELECT id, loan_id, principal_before, principal_paid, 
                   principal_after, interest_rate, payment_date, notes, created_at
            FROM loan_to_pay_payments
            WHERE loan_id = %s
            ORDER BY payment_date DESC
        """, (loan_id,))
        payments = cur.fetchall()
        
        for payment in payments:
            payment['principal_before'] = float(payment['principal_before'])
            payment['principal_paid'] = float(payment['principal_paid'])
            payment['principal_after'] = float(payment['principal_after'])
            payment['interest_rate'] = float(payment['interest_rate'])
        
        return jsonify(payments)

@loan_bp.route("/api/loans-to-pay/<int:loan_id>/payments", methods=["POST"])
def record_loan_to_pay_payment(loan_id):
    """Record a payment towards a loan to pay"""
    data = request.get_json(force=True)
    
    if "principal_paid" not in data:
        return jsonify({"error": "principal_paid is required"}), 400
    
    principal_paid = float(data["principal_paid"])
    
    with get_conn() as conn, conn.cursor() as cur:
        # Get current loan details
        cur.execute("""
            SELECT current_principal, interest_rate
            FROM loans_to_pay
            WHERE id = %s AND user_id = %s
        """, (loan_id, USER_ID))
        loan = cur.fetchone()
        
        if not loan:
            return jsonify({"error": "Loan not found"}), 404
        
        principal_before = float(loan['current_principal'])
        interest_rate = float(loan['interest_rate'])
        principal_after = principal_before - principal_paid
        
        if principal_after < 0:
            return jsonify({"error": "Payment exceeds current principal"}), 400
        
        # Record the payment
        cur.execute("""
            INSERT INTO loan_to_pay_payments 
            (loan_id, principal_before, principal_paid, principal_after, 
             interest_rate, payment_date, notes)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
            RETURNING id, loan_id, principal_before, principal_paid, 
                      principal_after, interest_rate, payment_date, notes
        """, (
            loan_id,
            principal_before,
            principal_paid,
            principal_after,
            interest_rate,
            data.get("payment_date", str(date.today())),
            data.get("notes")
        ))
        payment = cur.fetchone()
        
        # Update current_principal in loans_to_pay
        status = "paid_off" if principal_after == 0 else "active"
        cur.execute("""
            UPDATE loans_to_pay
            SET current_principal = %s, status = %s
            WHERE id = %s
        """, (principal_after, status, loan_id))
        
        payment['principal_before'] = float(payment['principal_before'])
        payment['principal_paid'] = float(payment['principal_paid'])
        payment['principal_after'] = float(payment['principal_after'])
        payment['interest_rate'] = float(payment['interest_rate'])
        
        return jsonify(payment), 201
