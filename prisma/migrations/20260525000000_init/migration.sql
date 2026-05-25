CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "raw_text" TEXT NOT NULL,
    "parsed_data" JSONB NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "portfolio_positions" (
    "ticker" TEXT NOT NULL,
    "shares" DECIMAL(18,6) NOT NULL,
    "avg_cost" DECIMAL(18,6),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "portfolio_positions_pkey" PRIMARY KEY ("ticker")
);
