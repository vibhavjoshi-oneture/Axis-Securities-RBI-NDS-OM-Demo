-- ========================================================
-- AUTOMATICALLY SYNCHRONIZED LOCAL POSTGRESQL SCHEMA DUMP
-- Generated on: 2026-05-27
-- ========================================================

CREATE SCHEMA IF NOT EXISTS ndsom;
SET search_path TO ndsom, public;

DROP TABLE IF EXISTS ndsom.audit_events CASCADE;
DROP TABLE IF EXISTS ndsom.ledger_entries CASCADE;
DROP TABLE IF EXISTS ndsom.trades CASCADE;
DROP TABLE IF EXISTS ndsom.orders CASCADE;
DROP TABLE IF EXISTS ndsom.positions CASCADE;
DROP TABLE IF EXISTS ndsom.funds CASCADE;
DROP TABLE IF EXISTS ndsom.securities CASCADE;
DROP TABLE IF EXISTS ndsom.customers CASCADE;

-- Table Structure: ndsom.customers
CREATE TABLE ndsom.customers (
    customer_id BIGSERIAL,
    customercode CHARACTER VARYING NOT NULL,
    name CHARACTER VARYING NOT NULL,
    pan CHARACTER VARYING NOT NULL,
    status CHARACTER VARYING NOT NULL,
    password_hash CHARACTER VARYING NOT NULL,
    gsecenabled BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT customers_customercode_key UNIQUE (customercode),
    PRIMARY KEY (customer_id)
);

-- Table Structure: ndsom.securities
CREATE TABLE ndsom.securities (
    security_id BIGSERIAL,
    isin CHARACTER VARYING NOT NULL,
    contractid CHARACTER VARYING NOT NULL,
    name CHARACTER VARYING NOT NULL,
    coupon CHARACTER VARYING NOT NULL,
    maturitydate DATE NOT NULL,
    bid NUMERIC(10, 4) NOT NULL,
    ask NUMERIC(10, 4) NOT NULL,
    ltp NUMERIC(10, 4) NOT NULL,
    yield CHARACTER VARYING NOT NULL,
    lotsize INTEGER NOT NULL,
    ticksize NUMERIC(10, 4) NOT NULL,
    PRIMARY KEY (security_id)
);

-- Table Structure: ndsom.funds
CREATE TABLE ndsom.funds (
    fund_id BIGSERIAL,
    customercode CHARACTER VARYING NOT NULL,
    availablebalance NUMERIC(15, 2) NOT NULL DEFAULT 0.0,
    blockedbalance NUMERIC(15, 2) NOT NULL DEFAULT 0.0,
    usedtoday NUMERIC(15, 2) NOT NULL DEFAULT 0.0,
    PRIMARY KEY (fund_id)
);

-- Table Structure: ndsom.positions
CREATE TABLE ndsom.positions (
    position_id BIGSERIAL,
    customercode CHARACTER VARYING NOT NULL,
    isin CHARACTER VARYING NOT NULL,
    securityname CHARACTER VARYING NOT NULL,
    quantity INTEGER NOT NULL,
    averageprice NUMERIC(10, 4) NOT NULL,
    marketvalue NUMERIC(15, 2) NOT NULL,
    UNIQUE(customercode, isin),
    PRIMARY KEY (position_id)
);

-- Table Structure: ndsom.orders
CREATE TABLE ndsom.orders (
    order_id BIGSERIAL,
    customercode CHARACTER VARYING NOT NULL,
    clientid CHARACTER VARYING NOT NULL,
    clordid CHARACTER VARYING NOT NULL,
    ndsorderid CHARACTER VARYING,
    isin CHARACTER VARYING NOT NULL,
    contractid CHARACTER VARYING NOT NULL,
    securityname CHARACTER VARYING NOT NULL,
    side CHARACTER VARYING NOT NULL,
    ordertype CHARACTER VARYING NOT NULL,
    quantity INTEGER NOT NULL,
    limitprice NUMERIC(10, 4) NOT NULL,
    ordervalue NUMERIC(15, 2) NOT NULL,
    status CHARACTER VARYING NOT NULL,
    message TEXT,
    lastactivitytimestamp BIGINT,
    fixrequest TEXT,
    fixresponse TEXT,
    createdat TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updatedat TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (order_id)
);

-- Table Structure: ndsom.trades
CREATE TABLE ndsom.trades (
    trade_id BIGSERIAL,
    customercode CHARACTER VARYING NOT NULL,
    orderid BIGINT NOT NULL,
    isin CHARACTER VARYING NOT NULL,
    securityname CHARACTER VARYING NOT NULL,
    side CHARACTER VARYING NOT NULL,
    quantity INTEGER NOT NULL,
    price NUMERIC(10, 4) NOT NULL,
    tradevalue NUMERIC(15, 2) NOT NULL,
    tradetime TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (trade_id)
);

-- Table Structure: ndsom.ledger_entries
CREATE TABLE ndsom.ledger_entries (
    ledger_id BIGSERIAL,
    customercode CHARACTER VARYING NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    type CHARACTER VARYING NOT NULL,
    amount NUMERIC(15, 2) NOT NULL,
    balanceafter NUMERIC(15, 2) NOT NULL,
    referenceid CHARACTER VARYING NOT NULL,
    status CHARACTER VARYING NOT NULL,
    description TEXT NOT NULL,
    PRIMARY KEY (ledger_id)
);

-- Table Structure: ndsom.audit_events
CREATE TABLE ndsom.audit_events (
    audit_id BIGSERIAL,
    eventtype CHARACTER VARYING NOT NULL,
    payload JSONB NOT NULL,
    createdat TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (audit_id)
);

-- Foreign Key Constraints
ALTER TABLE ndsom.funds ADD CONSTRAINT funds_customercode_fkey FOREIGN KEY (customercode) REFERENCES ndsom.customers(customercode) ON DELETE CASCADE;
ALTER TABLE ndsom.positions ADD CONSTRAINT positions_customercode_fkey FOREIGN KEY (customercode) REFERENCES ndsom.customers(customercode) ON DELETE CASCADE;
ALTER TABLE ndsom.positions ADD CONSTRAINT positions_isin_fkey FOREIGN KEY (isin) REFERENCES ndsom.securities(isin) ON DELETE CASCADE;
ALTER TABLE ndsom.orders ADD CONSTRAINT orders_customercode_fkey FOREIGN KEY (customercode) REFERENCES ndsom.customers(customercode) ON DELETE CASCADE;
ALTER TABLE ndsom.orders ADD CONSTRAINT orders_isin_fkey FOREIGN KEY (isin) REFERENCES ndsom.securities(isin) ON DELETE CASCADE;
ALTER TABLE ndsom.trades ADD CONSTRAINT trades_customercode_fkey FOREIGN KEY (customercode) REFERENCES ndsom.customers(customercode) ON DELETE CASCADE;
ALTER TABLE ndsom.trades ADD CONSTRAINT trades_orderid_fkey FOREIGN KEY (orderid) REFERENCES ndsom.orders(order_id) ON DELETE CASCADE;
ALTER TABLE ndsom.trades ADD CONSTRAINT trades_isin_fkey FOREIGN KEY (isin) REFERENCES ndsom.securities(isin) ON DELETE CASCADE;
ALTER TABLE ndsom.ledger_entries ADD CONSTRAINT ledger_entries_customercode_fkey FOREIGN KEY (customercode) REFERENCES ndsom.customers(customercode) ON DELETE CASCADE;

-- ========================================================
-- SYNCHRONIZED SEED DATA FROM LOCAL DATABASE
-- ========================================================

-- Data for table: ndsom.customers
INSERT INTO ndsom.customers (customer_id, customercode, name, pan, status, password_hash, gsecenabled) VALUES (1, 'ASL-DEMO-1001', 'Demo Retail Investor', 'ABCDE1234F', 'ACTIVE', '5e883822a2f628547812f6931909321397e52a9700604019a4136d4ff28f7c93', True);

-- Data for table: ndsom.securities
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (1, 'IN0020240010', '1234567', 'GOI 7.18% 2033', '7.18%', '2033-08-14', '99.8400', '99.8600', '99.8500', '7.19%', 10000, '0.0025');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (2, 'IN0020230098', '2345678', 'GOI 7.26% 2032', '7.26%', '2032-08-22', '100.1200', '100.1600', '100.1400', '7.22%', 10000, '0.0025');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (3, 'IN0020220069', '3456789', 'GOI 7.10% 2034', '7.10%', '2034-04-18', '98.7200', '98.7800', '98.7600', '7.31%', 10000, '0.0025');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (4, 'IN0020210051', '4567890', 'GOI 6.54% 2032', '6.54%', '2032-01-17', '96.3000', '96.3600', '96.3400', '7.28%', 10000, '0.0025');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (5, 'IN0020230085', '7.18 GS 2033', '7.18% Government Security 2033', '7.18%', '2033-08-14', '99.8540', '99.8820', '99.8650', '7.18%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (6, 'IN0020220011', '7.26 GS 2032', '7.26% Government Security 2032', '7.26%', '2032-02-06', '100.1220', '100.1510', '100.1400', '7.24%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (7, 'IN002023X012', '91 DTB 22062026', '91 Days Treasury Bill 2026', '0.00%', '2026-06-22', '98.2450', '98.2600', '98.2520', '6.85%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (8, 'IN0020150036', '6.89 GS 2025', '6.89% Government Security 2025', '6.89%', '2025-10-15', '99.9410', '99.9620', '99.9500', '6.90%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (9, 'IN0020210244', '8.20 SDL 2028', '8.20% Maharashtra State Dev Loan 2028', '8.20%', '2028-11-20', '102.4500', '102.4850', '102.4600', '7.45%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (10, '06.48GS20350', '06.48 GS 2035', '06.48 GS 2035', '06.48%', '2033-08-14', '96.5550', '96.5650', '96.5650', '6.98470000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (11, '06.94GS20360', '06.94 GS 2036', '06.94 GS 2036', '06.94%', '2033-08-14', '99.7600', '99.7725', '99.7750', '6.97100000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (12, '06.68GS20400', '06.68 GS 2040', '06.68 GS 2040', '06.68%', '2033-08-14', '94.1300', '94.1650', '94.1500', '7.35210000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (13, '06.36GS20310', '06.36 GS 2031', '06.36 GS 2031', '06.36%', '2033-08-14', '98.2000', '98.2300', '98.2200', '6.80450000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (23, '06.33GS20350', '06.33 GS 2035', '06.33 GS 2035', '06.33%', '2033-08-14', '96.3700', '96.4500', '96.4500', '6.86730000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (26, '06.79GS20340', '06.79 GS 2034', '06.79 GS 2034', '06.79%', '2033-08-14', '98.5000', '98.5900', '98.5900', '7.01390000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (3445, '08.33GS20260', '08.33 GS 2026', '08.33 GS 2026', '08.33%', '2033-08-14', '100.2500', '0.0000', '100.2950', '5.42190000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (20, '06.01GS20300', '06.01 GS 2030', '06.01 GS 2030', '06.01%', '2033-08-14', '97.6800', '97.7700', '97.7200', '6.64560000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (15, '06.68GS20330', '06.68 GS 2033', '06.68 GS 2033', '06.68%', '2033-08-14', '98.4000', '98.4800', '98.4800', '6.96670000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (16, '06.90GS20650', '06.90 GS 2065', '06.90 GS 2065', '06.90%', '2033-08-14', '90.3000', '90.3800', '90.3800', '7.67950000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (21, '07.41GS20360', '07.41 GS 2036', '07.41 GS 2036', '07.41%', '2033-08-14', '102.5000', '102.6000', '102.6000', '7.05570000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (25, '07.24GS20550', '07.24 GS 2055', '07.24 GS 2055', '07.24%', '2033-08-14', '95.4000', '95.5775', '95.5850', '7.61750000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (19, '06.54GS20320', '06.54 GS 2032', '06.54 GS 2032', '06.54%', '2033-08-14', '98.1500', '98.2900', '98.3300', '6.90050000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (22, '07.54GS20360', '07.54 GS 2036', '07.54 GS 2036', '07.54%', '2033-08-14', '103.4000', '0.0000', '103.4500', '7.05250000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (3449, '07.02GS20310', '07.02 GS 2031', '07.02 GS 2031', '07.02%', '2033-08-14', '100.3000', '100.5500', '100.5000', '6.89980000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (3454, '06.79GS20310', '06.79 GS 2031', '06.79 GS 2031', '06.79%', '2033-08-14', '99.4300', '0.0000', '99.4300', '6.91290000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (3456, '07.17GS20300', '07.17 GS 2030', '07.17 GS 2030', '07.17%', '2033-08-14', '101.3000', '101.6100', '101.6100', '6.68930000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (37, '08.24GS20270', '08.24 GS 2027', '08.24 GS 2027', '08.24%', '2033-08-14', '101.4850', '101.7500', '0.0000', '0.00000000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (35, '07.40GS20350', '07.40 GS 2035', '07.40 GS 2035', '07.40%', '2033-08-14', '102.2000', '102.5000', '0.0000', '0.00000000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (3479, '07.62GS20390', '07.62 GS 2039', '07.62 GS 2039', '07.62%', '2033-08-14', '0.0000', '103.5500', '0.0000', '0.00000000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (3466, '07.16GS20500', '07.16 GS 2050', '07.16 GS 2050', '07.16%', '2033-08-14', '0.0000', '95.9000', '0.0000', '0.00000000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (3467, '05.79GS20300', '05.79 GS 2030', '05.79 GS 2030', '05.79%', '2033-08-14', '0.0000', '97.3500', '0.0000', '0.00000000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (33, '06.79GS20270', '06.79 GS 2027', '06.79 GS 2027', '06.79%', '2033-08-14', '100.5850', '100.6500', '0.0000', '0.00000000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (3505, '08.32GS20320', '08.32 GS 2032', '08.32 GS 2032', '08.32%', '2033-08-14', '0.0000', '107.0000', '0.0000', '0.00000000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (3520, '06.97GS20260', '06.97 GS 2026', '06.97 GS 2026', '06.97%', '2033-08-14', '100.2000', '100.2750', '0.0000', '0.00000000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (3522, '07.09GS25NOV', '07.09GS25NOV2074P', '07.09GS25NOV2074P', '0%', '2033-08-14', '0.0000', '2.8152', '0.0000', '0.00000000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (3523, 'GS22OCT2039C', 'GS22OCT2039C', 'GS22OCT2039C', '0%', '2033-08-14', '0.0000', '37.5329', '0.0000', '0.00000000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (3524, 'GS25MAY2041C', 'GS25MAY2041C', 'GS25MAY2041C', '0%', '2033-08-14', '0.0000', '32.9288', '0.0000', '0.00000000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (38, '06.67GS20350', '06.67 GS 2035', '06.67 GS 2035', '06.67%', '2033-08-14', '0.0000', '0.0000', '96.9200', '7.11850000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (3491, '07.23GS20390', '07.23 GS 2039', '07.23 GS 2039', '07.23%', '2033-08-14', '99.0000', '0.0000', '0.0000', '0.00000000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (30, '07.18GS20370', '07.18 GS 2037', '07.18 GS 2037', '07.18%', '2033-08-14', '100.6600', '100.8000', '100.7500', '7.07990000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (43, '07.25GS20630', '07.25 GS 2063', '07.25 GS 2063', '07.25%', '2033-08-14', '94.2500', '94.7500', '94.2500', '7.72220000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (3484, '07.26GS20320', '07.26 GS 2032', '07.26 GS 2032', '07.26%', '2033-08-14', '101.3025', '101.5000', '101.4275', '6.97050000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (3513, '06.79GS20290', '06.79 GS 2029', '06.79 GS 2029', '06.79%', '2033-08-14', '100.2025', '100.3000', '100.3000', '6.69200000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (42, '05.77GS20300', '05.77 GS 2030', '05.77 GS 2030', '05.77%', '2033-08-14', '96.5000', '96.7500', '96.4000', '6.77060000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (3485, '07.26GS20330', '07.26 GS 2033', '07.26 GS 2033', '07.26%', '2033-08-14', '101.2400', '101.4800', '101.3500', '7.00090000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (3509, '08.24GS20330', '08.24 GS 2033', '08.24 GS 2033', '08.24%', '2033-08-14', '106.7000', '106.7500', '106.7500', '7.05790000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (3514, '06.68GS20310', '06.68 GS 2031', '06.68 GS 2031', '06.68%', '2033-08-14', '99.0000', '99.1000', '98.9000', '6.92840000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (28, '07.10GS20340', '07.10 GS 2034', '07.10 GS 2034', '07.10%', '2033-08-14', '100.4200', '100.5275', '100.5000', '7.01410000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (3501, '07.50GS20340', '07.50 GS 2034', '07.50 GS 2034', '07.50%', '2033-08-14', '102.8000', '102.9300', '102.8700', '7.03090000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (39, '05.74GS20260', '05.74 GS 2026', '05.74 GS 2026', '05.74%', '2033-08-14', '0.0000', '99.9700', '0.0000', '0.00000000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (29, '06.99GS20510', '06.99 GS 2051', '06.99 GS 2051', '06.99%', '2033-08-14', '0.0000', '93.1000', '0.0000', '0.00000000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (14, '07.38GS20270', '07.38 GS 2027', '07.38 GS 2027', '07.38%', '2033-08-14', '101.2500', '101.3200', '0.0000', '0.00000000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (3510, '07.88GS20300', '07.88 GS 2030', '07.88 GS 2030', '07.88%', '2033-08-14', '0.0000', '103.7700', '0.0000', '0.00000000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (3543, '08.17GS20440', '08.17 GS 2044', '08.17 GS 2044', '08.17%', '2033-08-14', '0.0000', '107.3500', '106.7925', '7.48590000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (3541, '07.36GS20520', '07.36 GS 2052', '07.36 GS 2052', '07.36%', '2033-08-14', '0.0000', '0.0000', '97.1050', '7.61490000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (41, '06.22GS20350', '06.22 GS 2035', '06.22 GS 2035', '06.22%', '2033-08-14', '94.4200', '0.0000', '94.8275', '7.01590000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (3460, '06.64GS20350', '06.64 GS 2035', '06.64 GS 2035', '06.64%', '2033-08-14', '0.0000', '97.8800', '97.4300', '7.02790000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (3548, '09.23GS20430', '09.23 GS 2043', '09.23 GS 2043', '09.23%', '2033-08-14', '0.0000', '0.0000', '116.5725', '7.51440000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (3463, '07.06GS20460', '07.06 GS 2046', '07.06 GS 2046', '07.06%', '2033-08-14', '94.2500', '94.9000', '94.8550', '7.55780000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (3458, '07.46GS20730', '07.46 GS 2073', '07.46 GS 2073', '07.46%', '2033-08-14', '0.0000', '0.0000', '97.0000', '7.69690000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (3459, '08.13GS20450', '08.13 GS 2045', '08.13 GS 2045', '08.13%', '2033-08-14', '0.0000', '106.3500', '105.9400', '7.53690000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (3461, '06.03GS20290', '06.03 GS 2029', '06.03 GS 2029', '06.03%', '2033-08-14', '98.6000', '98.7800', '98.7800', '6.53250000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (3519, '08.15GS20260', '08.15 GS 2026', '08.15 GS 2026', '08.15%', '2033-08-14', '0.0000', '101.1000', '0.0000', '0.00000000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (31, '07.71GS20660', '07.71 GS 2066', '07.71 GS 2066', '07.71%', '2033-08-14', '100.1000', '100.8500', '0.0000', '0.00000000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (18, '07.06GS20280', '07.06 GS 2028', '07.06 GS 2028', '07.06%', '2033-08-14', '101.1500', '101.5000', '0.0000', '0.00000000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (40, '07.30GS20530', '07.30 GS 2053', '07.30 GS 2053', '07.30%', '2033-08-14', '96.1000', '96.9400', '0.0000', '0.00000000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (32, '07.37GS20280', '07.37 GS 2028', '07.37 GS 2028', '07.37%', '2033-08-14', '101.7725', '102.4900', '0.0000', '0.00000000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (3512, '06.57GS20330', '06.57 GS 2033', '06.57 GS 2033', '06.57%', '2033-08-14', '0.0000', '97.9000', '0.0000', '0.00000000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (3507, '06.83GS20390', '06.83 GS 2039', '06.83 GS 2039', '06.83%', '2033-08-14', '0.0000', '97.4000', '0.0000', '0.00000000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (3464, '07.17GS20280', '07.17 GS 2028', '07.17 GS 2028', '07.17%', '2033-08-14', '101.4500', '101.6000', '0.0000', '0.00000000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (3506, '08.28GS20270', '08.28 GS 2027', '08.28 GS 2027', '08.28%', '2033-08-14', '102.5500', '102.6500', '0.0000', '0.00000000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (3470, 'GOIFRB203400', 'GOI FRB 2034', 'GOI FRB 2034', 'GOI%', '2033-08-14', '102.7500', '102.8500', '0.0000', '0.00000000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (3480, '06.76GS20610', '06.76 GS 2061', '06.76 GS 2061', '06.76%', '2033-08-14', '88.2200', '89.2000', '0.0000', '0.00000000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (3481, '06.10GS20310', '06.10 GS 2031', '06.10 GS 2031', '06.10%', '2033-08-14', '96.6000', '96.9500', '0.0000', '0.00000000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (36, 'GOIFRB202800', 'GOI FRB 2028', 'GOI FRB 2028', 'GOI%', '2033-08-14', '100.6500', '100.8500', '0.0000', '0.00000000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (3473, '07.10GS20290', '07.10 GS 2029', '07.10 GS 2029', '07.10%', '2033-08-14', '101.0000', '101.5700', '0.0000', '0.00000000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (3478, '07.26GS20290', '07.26 GS 2029', '07.26 GS 2029', '07.26%', '2033-08-14', '101.5400', '101.9150', '0.0000', '0.00000000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (3504, '08.26GS20270', '08.26 GS 2027', '08.26 GS 2027', '08.26%', '2033-08-14', '0.0000', '102.7400', '0.0000', '0.00000000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (3516, '08.23GOIFCI2', '08.23 GOI FCI 2027', '08.23 GOI FCI 2027', '08.23%', '2033-08-14', '0.0000', '101.2000', '0.0000', '0.00000000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (3500, '06.01GS20280', '06.01 GS 2028', '06.01 GS 2028', '06.01%', '2033-08-14', '99.1600', '99.3000', '0.0000', '0.00000000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (24, '07.18GS20330', '07.18 GS 2033', '07.18 GS 2033', '07.18%', '2033-08-14', '100.9000', '101.1000', '0.0000', '0.00000000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (3489, '07.32GS20300', '07.32 GS 2030', '07.32 GS 2030', '07.32%', '2033-08-14', '102.0500', '102.5200', '0.0000', '0.00000000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (27, '07.34GS20640', '07.34 GS 2064', '07.34 GS 2064', '07.34%', '2033-08-14', '95.4000', '95.6500', '0.0000', '0.00000000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (34, '10.18GS20260', '10.18 GS 2026', '10.18 GS 2026', '10.18%', '2033-08-14', '0.0000', '101.3000', '0.0000', '0.00000000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (3494, '07.09GS20540', '07.09 GS 2054', '07.09 GS 2054', '07.09%', '2033-08-14', '0.0000', '97.6000', '0.0000', '0.00000000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (3495, '06.92GS20390', '06.92 GS 2039', '06.92 GS 2039', '06.92%', '2033-08-14', '97.1500', '98.0000', '0.0000', '0.00000000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (3497, '06.64GS20270', '06.64 GS 2027', '06.64 GS 2027', '06.64%', '2033-08-14', '100.6500', '100.7800', '0.0000', '0.00000000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (3498, '06.75GS20290', '06.75 GS 2029', '06.75 GS 2029', '06.75%', '2033-08-14', '100.3000', '100.5500', '0.0000', '0.00000000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (3496, '06.28GS20320', '06.28 GS 2032', '06.28 GS 2032', '06.28%', '2033-08-14', '96.7000', '97.0000', '0.0000', '0.00000000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (3508, '08.60GS20280', '08.60 GS 2028', '08.60 GS 2028', '08.60%', '2033-08-14', '0.0000', '104.3000', '0.0000', '0.00000000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (17, '07.02GS20270', '07.02 GS 2027', '07.02 GS 2027', '07.02%', '2033-08-14', '100.8300', '100.9000', '0.0000', '0.00000000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (3493, '07.04GS20290', '07.04 GS 2029', '07.04 GS 2029', '07.04%', '2033-08-14', '101.2000', '101.2450', '0.0000', '0.00000000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (3518, '09.20GS20300', '09.20 GS 2030', '09.20 GS 2030', '09.20%', '2033-08-14', '0.0000', '108.9200', '0.0000', '0.00000000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (3517, '08.97GS20300', '08.97 GS 2030', '08.97 GS 2030', '08.97%', '2033-08-14', '0.0000', '108.5500', '0.0000', '0.00000000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (3468, 'GOIFRB203300', 'GOI FRB 2033', 'GOI FRB 2033', 'GOI%', '2033-08-14', '104.0000', '104.1000', '0.0000', '0.00000000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (3511, '07.59GS20290', '07.59 GS 2029', '07.59 GS 2029', '07.59%', '2033-08-14', '0.0000', '102.6000', '0.0000', '0.00000000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (3465, 'GOIFRB203100', 'GOI FRB 2031', 'GOI FRB 2031', 'GOI%', '2033-08-14', '102.7800', '102.8775', '0.0000', '0.00000000%', 10000, '0.0005');
INSERT INTO ndsom.securities (security_id, isin, contractid, name, coupon, maturitydate, bid, ask, ltp, yield, lotsize, ticksize) VALUES (3575, '07.57GS20330', '07.57 GS 2033', '07.57 GS 2033', '07.57%', '2033-08-14', '102.6500', '0.0000', '0.0000', '0.00000000%', 10000, '0.0005');

-- Data for table: ndsom.funds
INSERT INTO ndsom.funds (fund_id, customercode, availablebalance, blockedbalance, usedtoday) VALUES (1, 'ASL-DEMO-1001', '1880417.50', '230182.50', '389400.00');

-- Data for table: ndsom.positions
INSERT INTO ndsom.positions (position_id, customercode, isin, securityname, quantity, averageprice, marketvalue) VALUES (1, 'ASL-DEMO-1001', 'IN0020240010', 'GOI 7.18% 2033', 150000, '99.7200', '149580.00');
INSERT INTO ndsom.positions (position_id, customercode, isin, securityname, quantity, averageprice, marketvalue) VALUES (2, 'ASL-DEMO-1001', 'IN0020230098', 'GOI 7.26% 2032', 50000, '100.0500', '50070.00');
INSERT INTO ndsom.positions (position_id, customercode, isin, securityname, quantity, averageprice, marketvalue) VALUES (3, 'ASL-DEMO-1001', '05.79GS20300', '05.79 GS 2030', 400000, '97.3500', '389400.00');

-- Data for table: ndsom.orders
INSERT INTO ndsom.orders (order_id, customercode, clientid, clordid, ndsorderid, isin, contractid, securityname, side, ordertype, quantity, limitprice, ordervalue, status, message, lastactivitytimestamp, fixrequest, fixresponse, createdat, updatedat) VALUES (1, 'ASL-DEMO-1001', 'CL001', '72057598332895233', NULL, '05.74GS20260', '05.74 GS 2026', '05.74 GS 2026', 'BUY', 'LIMIT', 110000, '99.9700', '109967.00', 'REJECTED', 'missing required parameters', 0, '{"clOrdId":"72057598332895233","contractId":"05.74 GS 2026","side":"BUY","quantity":110000,"limitPrice":99.97}', '{"error":true,"status_code":400,"message":"missing required parameters"}', '2026-05-27 12:31:29.470743+05:30', '2026-05-27 12:31:29.470743+05:30');
INSERT INTO ndsom.orders (order_id, customercode, clientid, clordid, ndsorderid, isin, contractid, securityname, side, ordertype, quantity, limitprice, ordervalue, status, message, lastactivitytimestamp, fixrequest, fixresponse, createdat, updatedat) VALUES (2, 'ASL-DEMO-1001', 'CL001', '72057598332895234', NULL, '05.74GS20260', '05.74 GS 2026', '05.74 GS 2026', 'BUY', 'LIMIT', 110000, '99.9700', '109967.00', 'REJECTED', 'missing required parameters', 0, '{"clOrdId":"72057598332895234","contractId":"05.74 GS 2026","side":"BUY","quantity":110000,"limitPrice":99.97}', '{"error":true,"status_code":400,"message":"missing required parameters"}', '2026-05-27 12:32:34.691776+05:30', '2026-05-27 12:32:34.691776+05:30');
INSERT INTO ndsom.orders (order_id, customercode, clientid, clordid, ndsorderid, isin, contractid, securityname, side, ordertype, quantity, limitprice, ordervalue, status, message, lastactivitytimestamp, fixrequest, fixresponse, createdat, updatedat) VALUES (3, 'ASL-DEMO-1001', 'CL001', '72057598332895233', NULL, 'IN0020240010', '1234567', 'GOI 7.18% 2033', 'SELL', 'LIMIT', 120000, '99.8400', '119808.00', 'REJECTED', 'missing required parameters', 0, '{"clOrdId":"72057598332895233","contractId":"1234567","side":"SELL","quantity":120000,"limitPrice":99.84}', '{"error":true,"status_code":400,"message":"missing required parameters"}', '2026-05-27 12:52:59.729133+05:30', '2026-05-27 12:52:59.729133+05:30');
INSERT INTO ndsom.orders (order_id, customercode, clientid, clordid, ndsorderid, isin, contractid, securityname, side, ordertype, quantity, limitprice, ordervalue, status, message, lastactivitytimestamp, fixrequest, fixresponse, createdat, updatedat) VALUES (4, 'ASL-DEMO-1001', 'CL001', '72057598332895234', NULL, 'IN0020210244', '8.20 SDL 2028', '8.20% Maharashtra State Dev Loan 2028', 'BUY', 'LIMIT', 10000, '102.4850', '10248.50', 'REJECTED', 'missing required parameters', 0, '{"clOrdId":"72057598332895234","contractId":"8.20 SDL 2028","side":"BUY","quantity":10000,"limitPrice":102.485}', '{"error":true,"status_code":400,"message":"missing required parameters"}', '2026-05-27 12:56:11.385355+05:30', '2026-05-27 12:56:11.385355+05:30');
INSERT INTO ndsom.orders (order_id, customercode, clientid, clordid, ndsorderid, isin, contractid, securityname, side, ordertype, quantity, limitprice, ordervalue, status, message, lastactivitytimestamp, fixrequest, fixresponse, createdat, updatedat) VALUES (7, 'ASL-DEMO-1001', 'CL001', '72057598332895233', 'NDS-18C7391A', '05.79GS20300', '05.79 GS 2030', '05.79 GS 2030', 'BUY', 'LIMIT', 100000, '97.3500', '97350.00', 'EXECUTED', 'All allocations executed and completed on clearing corporation (T+1).', 0, '{"clOrdId":"72057598332895233","contractId":"05.79 GS 2030","side":"BUY","quantity":100000,"limitPrice":97.35}', '{"client_order_id":"72057598332895233","message":"ExecType=0 OrdStatus=0. ExecutionReport: New Order Accepted","nds_order_id":"NDS-18C7391A","status":"created"}', '2026-05-27 13:07:15.320362+05:30', '2026-05-27 13:07:21.873472+05:30');
INSERT INTO ndsom.orders (order_id, customercode, clientid, clordid, ndsorderid, isin, contractid, securityname, side, ordertype, quantity, limitprice, ordervalue, status, message, lastactivitytimestamp, fixrequest, fixresponse, createdat, updatedat) VALUES (5, 'ASL-DEMO-1001', 'CL001', '72057598332895233', 'NDS-CC53DCF1', '05.79GS20300', '05.79 GS 2030', '05.79 GS 2030', 'BUY', 'LIMIT', 100000, '97.3500', '97350.00', 'EXECUTED', 'All allocations executed and completed on clearing corporation (T+1).', 0, '{"clOrdId":"72057598332895233","contractId":"05.79 GS 2030","side":"BUY","quantity":100000,"limitPrice":97.35}', '{"client_order_id":"72057598332895233","message":"ExecType=0 OrdStatus=0. ExecutionReport: New Order Accepted","nds_order_id":"NDS-CC53DCF1","status":"created"}', '2026-05-27 13:02:58.788861+05:30', '2026-05-27 13:03:05.439418+05:30');
INSERT INTO ndsom.orders (order_id, customercode, clientid, clordid, ndsorderid, isin, contractid, securityname, side, ordertype, quantity, limitprice, ordervalue, status, message, lastactivitytimestamp, fixrequest, fixresponse, createdat, updatedat) VALUES (6, 'ASL-DEMO-1001', 'CL001', '72057598332895234', 'NDS-4EE02140', '05.79GS20300', '05.79 GS 2030', '05.79 GS 2030', 'BUY', 'LIMIT', 100000, '97.3500', '97350.00', 'EXECUTED', 'All allocations executed and completed on clearing corporation (T+1).', 0, '{"clOrdId":"72057598332895234","contractId":"05.79 GS 2030","side":"BUY","quantity":100000,"limitPrice":97.35}', '{"client_order_id":"72057598332895234","message":"ExecType=0 OrdStatus=0. ExecutionReport: New Order Accepted","nds_order_id":"NDS-4EE02140","status":"created"}', '2026-05-27 13:04:08.998852+05:30', '2026-05-27 13:04:15.675642+05:30');
INSERT INTO ndsom.orders (order_id, customercode, clientid, clordid, ndsorderid, isin, contractid, securityname, side, ordertype, quantity, limitprice, ordervalue, status, message, lastactivitytimestamp, fixrequest, fixresponse, createdat, updatedat) VALUES (8, 'ASL-DEMO-1001', 'CL001', '72057598332895234', 'NDS-553A25B9', '05.79GS20300', '05.79 GS 2030', '05.79 GS 2030', 'BUY', 'LIMIT', 100000, '97.3500', '97350.00', 'EXECUTED', 'All allocations executed and completed on clearing corporation (T+1).', 0, '{"clOrdId":"72057598332895234","contractId":"05.79 GS 2030","side":"BUY","quantity":100000,"limitPrice":97.35}', '{"client_order_id":"72057598332895234","message":"ExecType=0 OrdStatus=0. ExecutionReport: New Order Accepted","nds_order_id":"NDS-553A25B9","status":"created"}', '2026-05-27 14:11:40.253330+05:30', '2026-05-27 14:11:47.003021+05:30');
INSERT INTO ndsom.orders (order_id, customercode, clientid, clordid, ndsorderid, isin, contractid, securityname, side, ordertype, quantity, limitprice, ordervalue, status, message, lastactivitytimestamp, fixrequest, fixresponse, createdat, updatedat) VALUES (9, 'ASL-DEMO-1001', 'CL001', '72057598332895235', NULL, '05.79GS20300', '05.79 GS 2030', '05.79 GS 2030', 'SELL', 'LIMIT', 110000, '0.0000', '0.00', 'REJECTED', 'missing required parameters', 0, '{"clOrdId":"72057598332895235","contractId":"05.79 GS 2030","side":"SELL","quantity":110000,"limitPrice":0.0}', '{"error":true,"status_code":400,"message":"missing required parameters"}', '2026-05-27 14:11:58.462708+05:30', '2026-05-27 14:11:58.462708+05:30');

-- Data for table: ndsom.trades
INSERT INTO ndsom.trades (trade_id, customercode, orderid, isin, securityname, side, quantity, price, tradevalue, tradetime) VALUES (1, 'ASL-DEMO-1001', 5, '05.79GS20300', '05.79 GS 2030', 'BUY', 100000, '97.3500', '97350.00', '2026-05-27 13:03:05.439418+05:30');
INSERT INTO ndsom.trades (trade_id, customercode, orderid, isin, securityname, side, quantity, price, tradevalue, tradetime) VALUES (2, 'ASL-DEMO-1001', 6, '05.79GS20300', '05.79 GS 2030', 'BUY', 100000, '97.3500', '97350.00', '2026-05-27 13:04:15.675642+05:30');
INSERT INTO ndsom.trades (trade_id, customercode, orderid, isin, securityname, side, quantity, price, tradevalue, tradetime) VALUES (3, 'ASL-DEMO-1001', 7, '05.79GS20300', '05.79 GS 2030', 'BUY', 100000, '97.3500', '97350.00', '2026-05-27 13:07:21.873472+05:30');
INSERT INTO ndsom.trades (trade_id, customercode, orderid, isin, securityname, side, quantity, price, tradevalue, tradetime) VALUES (4, 'ASL-DEMO-1001', 8, '05.79GS20300', '05.79 GS 2030', 'BUY', 100000, '97.3500', '97350.00', '2026-05-27 14:11:47.003021+05:30');

-- Data for table: ndsom.ledger_entries
INSERT INTO ndsom.ledger_entries (ledger_id, customercode, timestamp, type, amount, balanceafter, referenceid, status, description) VALUES (1, 'ASL-DEMO-1001', '2026-05-21 16:54:07.714114+05:30', 'DEPOSIT', '2500000.00', '2500000.00', 'REF-TXN-00921', 'COMPLETED', 'Opening sovereign allocation balance transfer');
INSERT INTO ndsom.ledger_entries (ledger_id, customercode, timestamp, type, amount, balanceafter, referenceid, status, description) VALUES (2, 'ASL-DEMO-1001', '2026-05-27 13:03:05.439418+05:30', 'RELEASE', '97350.00', '2172467.50', 'T-1', 'COMPLETED', 'Escrow block released on execution match: 05.79 GS 2030');
INSERT INTO ndsom.ledger_entries (ledger_id, customercode, timestamp, type, amount, balanceafter, referenceid, status, description) VALUES (3, 'ASL-DEMO-1001', '2026-05-27 13:04:15.675642+05:30', 'RELEASE', '97350.00', '2075117.50', 'T-2', 'COMPLETED', 'Escrow block released on execution match: 05.79 GS 2030');
INSERT INTO ndsom.ledger_entries (ledger_id, customercode, timestamp, type, amount, balanceafter, referenceid, status, description) VALUES (4, 'ASL-DEMO-1001', '2026-05-27 13:07:21.873472+05:30', 'RELEASE', '97350.00', '1977767.50', 'T-3', 'COMPLETED', 'Escrow block released on execution match: 05.79 GS 2030');
INSERT INTO ndsom.ledger_entries (ledger_id, customercode, timestamp, type, amount, balanceafter, referenceid, status, description) VALUES (5, 'ASL-DEMO-1001', '2026-05-27 14:11:47.003021+05:30', 'RELEASE', '97350.00', '1880417.50', 'T-4', 'COMPLETED', 'Escrow block released on execution match: 05.79 GS 2030');

-- Data for table: ndsom.audit_events
INSERT INTO ndsom.audit_events (audit_id, eventtype, payload, createdat) VALUES (1, 'SYSTEM', '{''details'': ''Axis Securities G-Sec trading module loaded successfully in PostgreSQL.'', ''success'': True}', '2026-05-21 16:54:07.714114+05:30');
INSERT INTO ndsom.audit_events (audit_id, eventtype, payload, createdat) VALUES (2, 'PLACE_ORDER', '{''input'': {''isin'': ''05.74GS20260'', ''side'': ''BUY'', ''quantity'': 110000, ''ordertype'': ''LIMIT'', ''limitprice'': 99.97, ''customercode'': ''ASL-DEMO-1001''}, ''orderId'': 1}', '2026-05-27 12:31:31.748027+05:30');
INSERT INTO ndsom.audit_events (audit_id, eventtype, payload, createdat) VALUES (3, 'PLACE_ORDER', '{''input'': {''isin'': ''05.74GS20260'', ''side'': ''BUY'', ''quantity'': 110000, ''ordertype'': ''LIMIT'', ''limitprice'': 99.97, ''customercode'': ''ASL-DEMO-1001''}, ''orderId'': 2}', '2026-05-27 12:32:36.900541+05:30');
INSERT INTO ndsom.audit_events (audit_id, eventtype, payload, createdat) VALUES (4, 'PLACE_ORDER', '{''input'': {''isin'': ''IN0020240010'', ''side'': ''SELL'', ''quantity'': 120000, ''ordertype'': ''LIMIT'', ''limitprice'': 99.84, ''customercode'': ''ASL-DEMO-1001''}, ''orderId'': 3}', '2026-05-27 12:53:02.022555+05:30');
INSERT INTO ndsom.audit_events (audit_id, eventtype, payload, createdat) VALUES (5, 'PLACE_ORDER', '{''input'': {''isin'': ''IN0020210244'', ''side'': ''BUY'', ''quantity'': 10000, ''ordertype'': ''LIMIT'', ''limitprice'': 102.485, ''customercode'': ''ASL-DEMO-1001''}, ''orderId'': 4}', '2026-05-27 12:56:13.632007+05:30');
INSERT INTO ndsom.audit_events (audit_id, eventtype, payload, createdat) VALUES (6, 'PLACE_ORDER', '{''input'': {''isin'': ''05.79GS20300'', ''side'': ''BUY'', ''quantity'': 100000, ''ordertype'': ''LIMIT'', ''limitprice'': 97.35, ''customercode'': ''ASL-DEMO-1001''}, ''orderId'': 5}', '2026-05-27 13:03:01.030344+05:30');
INSERT INTO ndsom.audit_events (audit_id, eventtype, payload, createdat) VALUES (7, 'PLACE_ORDER', '{''input'': {''isin'': ''05.79GS20300'', ''side'': ''BUY'', ''quantity'': 100000, ''ordertype'': ''LIMIT'', ''limitprice'': 97.35, ''customercode'': ''ASL-DEMO-1001''}, ''orderId'': 6}', '2026-05-27 13:04:11.323924+05:30');
INSERT INTO ndsom.audit_events (audit_id, eventtype, payload, createdat) VALUES (8, 'PLACE_ORDER', '{''input'': {''isin'': ''05.79GS20300'', ''side'': ''BUY'', ''quantity'': 100000, ''ordertype'': ''LIMIT'', ''limitprice'': 97.35, ''customercode'': ''ASL-DEMO-1001''}, ''orderId'': 7}', '2026-05-27 13:07:17.554915+05:30');
INSERT INTO ndsom.audit_events (audit_id, eventtype, payload, createdat) VALUES (9, 'PLACE_ORDER', '{''input'': {''isin'': ''05.79GS20300'', ''side'': ''BUY'', ''quantity'': 100000, ''ordertype'': ''LIMIT'', ''limitprice'': 97.35, ''customercode'': ''ASL-DEMO-1001''}, ''orderId'': 8}', '2026-05-27 14:11:42.559677+05:30');
INSERT INTO ndsom.audit_events (audit_id, eventtype, payload, createdat) VALUES (10, 'PLACE_ORDER', '{''input'': {''isin'': ''05.79GS20300'', ''side'': ''SELL'', ''quantity'': 110000, ''ordertype'': ''LIMIT'', ''limitprice'': 0.0, ''customercode'': ''ASL-DEMO-1001''}, ''orderId'': 9}', '2026-05-27 14:12:00.714529+05:30');
