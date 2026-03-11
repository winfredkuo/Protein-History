import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import fs from "fs";
import bodyParser from "body-parser";
import cors from "cors";
import { createClient } from "@supabase/supabase-js";

async function startServer() {
  const app = express();
  const PORT = 3000;
  const DATA_FILE = path.join(process.cwd(), "data.json");

  // Supabase Configuration
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;
  const supabase = (supabaseUrl && supabaseKey) 
    ? createClient(supabaseUrl, supabaseKey) 
    : null;

  if (supabase) {
    console.log("✅ Supabase permanent storage enabled.");
  } else {
    console.log("⚠️ Supabase not configured. Using temporary data.json storage.");
  }

  app.use(cors());
  app.use(bodyParser.json());

  // Helper to read/write data (Fallback to local file)
  const readLocalData = () => {
    if (!fs.existsSync(DATA_FILE)) return {};
    try {
      return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
    } catch (e) {
      return {};
    }
  };

  const writeLocalData = (data: any) => {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  };

  // API Routes
  app.get("/api/data/:userId", async (req, res) => {
    const { userId } = req.params;

    if (supabase) {
      try {
        const { data, error } = await supabase
          .from("user_data")
          .select("data")
          .eq("user_id", userId)
          .single();
        
        if (error && error.code !== "PGRST116") { // PGRST116 is "no rows found"
          console.error("Supabase read error:", error);
          return res.status(500).json({ error: "Database error" });
        }
        
        return res.json(data?.data || { profile: null, records: {}, inBodyRecords: [] });
      } catch (err) {
        console.error("Supabase fetch failed:", err);
      }
    }

    // Fallback to local file
    const allData = readLocalData();
    res.json(allData[userId] || { profile: null, records: {}, inBodyRecords: [] });
  });

  app.post("/api/data/:userId", async (req, res) => {
    const { userId } = req.params;
    const userData = req.body;

    if (supabase) {
      try {
        const { error } = await supabase
          .from("user_data")
          .upsert({ 
            user_id: userId, 
            data: userData,
            updated_at: new Date().toISOString()
          }, { onConflict: "user_id" });

        if (error) {
          console.error("Supabase write error:", error);
          return res.status(500).json({ error: "Database error" });
        }
        return res.json({ success: true });
      } catch (err) {
        console.error("Supabase upsert failed:", err);
      }
    }

    // Fallback to local file
    const allData = readLocalData();
    allData[userId] = userData;
    writeLocalData(allData);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
