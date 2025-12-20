//+------------------------------------------------------------------+
//|                                              MT5TradeLogger.mq5 |
//|                        Expert Advisor - Auto Trade Logger        |
//|                                                                  |
//+------------------------------------------------------------------+
#property copyright "Trading Journal System"
#property version   "1.00"
#property strict

#include <Trade\Trade.mqh>
#include <Trade\PositionInfo.mqh>
#include <Trade\AccountInfo.mqh>

//--- Input parameters
input string   InpServerURL = "https://tu-backend.com/api";  // Backend URL
input string   InpAPIKey    = "your-api-key-here";           // API Key for authentication (MT5_API_KEY)
input string   InpSupabaseAnonKey = "";                      // Supabase Anon Key (REQUIRED - get from Settings → API → anon public)
input int      InpTimeout   = 5000;                          // Request timeout (ms)
input int      InpRetryCount = 3;                            // Retry attempts on failure
input bool     InpEnableLogging = true;                      // Enable debug logging
input int      InpUpdateInterval = 5;                         // P&L update interval (seconds)
input bool     InpEnableRealTimePnL = true;                   // Enable real-time P&L updates

//--- Global variables
string         g_serverURL;
string         g_apiKey;
string         g_supabaseAnonKey;
int            g_timeout;
int            g_retryCount;
int            g_updateInterval;
bool           g_enableRealTimePnL;
CTrade         trade;
CPositionInfo  position;
CAccountInfo   account;

//--- Trade tracking
struct TradeData {
   string ticket;
   string trade_uid;
   string symbol;
   string side;
   double volume;
   double price_open;
   double price_close;
   double stop_loss;
   double take_profit;
   datetime time_open;
   datetime time_close;
   double profit;
   double commission;
   double swap;
   string account_mode;
   string broker;
};

//+------------------------------------------------------------------+
//| Expert initialization function                                   |
//+------------------------------------------------------------------+
int OnInit()
{
   // Validate inputs
   if(StringLen(InpServerURL) == 0) {
      Print("ERROR: Server URL is required");
      return INIT_PARAMETERS_INCORRECT;
   }
   
   if(StringLen(InpAPIKey) == 0) {
      Print("ERROR: API Key (MT5_API_KEY) is required");
      return INIT_PARAMETERS_INCORRECT;
   }
   
   if(StringLen(InpSupabaseAnonKey) == 0) {
      Print("ERROR: Supabase Anon Key is REQUIRED. Get it from Supabase Dashboard → Settings → API → anon public");
      return INIT_PARAMETERS_INCORRECT;
   }
   
   // Initialize global variables
   g_serverURL = InpServerURL;
   g_apiKey = InpAPIKey;
   g_supabaseAnonKey = InpSupabaseAnonKey;
   g_timeout = InpTimeout;
   g_retryCount = InpRetryCount;
   g_updateInterval = InpUpdateInterval;
   g_enableRealTimePnL = InpEnableRealTimePnL;
   
   // Ensure URL doesn't end with slash
   if(StringGetCharacter(g_serverURL, StringLen(g_serverURL) - 1) == '/') {
      StringSetCharacter(g_serverURL, StringLen(g_serverURL) - 1, 0);
      g_serverURL = StringSubstr(g_serverURL, 0, StringLen(g_serverURL) - 1);
   }
   
   Print("MT5 Trade Logger initialized");
   Print("Server URL: ", g_serverURL);
   Print("Account Mode: ", GetAccountMode());
   Print("Broker: ", GetBrokerName());
   
   // Process existing open positions on start
   ProcessExistingPositions();
   
   // Start timer for real-time P&L updates
   if(g_enableRealTimePnL && g_updateInterval > 0) {
      EventSetTimer(g_updateInterval);
      Print("Real-time P&L updates enabled. Interval: ", g_updateInterval, " seconds");
   }
   
   return INIT_SUCCEEDED;
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   // Kill timer if it was set
   if(g_enableRealTimePnL && g_updateInterval > 0) {
      EventKillTimer();
   }
   Print("MT5 Trade Logger deinitialized. Reason: ", reason);
}

//+------------------------------------------------------------------+
//| Expert tick function                                             |
//+------------------------------------------------------------------+
void OnTick()
{
   // This EA relies on OnTradeTransaction, not OnTick
}

//+------------------------------------------------------------------+
//| Timer function - Update P&L for open positions                  |
//+------------------------------------------------------------------+
void OnTimer()
{
   if(!g_enableRealTimePnL) {
      return;
   }
   
   // Update P&L for all open positions
   int total = PositionsTotal();
   for(int i = 0; i < total; i++) {
      if(position.SelectByIndex(i)) {
         UpdatePositionPnL(position.Ticket());
      }
   }
}

//+------------------------------------------------------------------+
//| Trade transaction event handler                                  |
//+------------------------------------------------------------------+
void OnTradeTransaction(const MqlTradeTransaction& trans,
                        const MqlTradeRequest& request,
                        const MqlTradeResult& result)
{
   // Handle position opening
   // Only process entry deals (not closing deals)
   if(trans.type == TRADE_TRANSACTION_DEAL_ADD) {
      ulong deal_ticket = trans.deal;
      
      if(HistoryDealSelect(deal_ticket)) {
         long deal_type = HistoryDealGetInteger(deal_ticket, DEAL_TYPE);
         ulong position_id = HistoryDealGetInteger(deal_ticket, DEAL_POSITION_ID);
         
         // Check if position still exists - if not, it's a closing deal, not an entry
         bool position_exists = false;
         int total = PositionsTotal();
         for(int i = 0; i < total; i++) {
            if(position.SelectByIndex(i)) {
               if(position.Identifier() == (long)position_id) {
                  position_exists = true;
                  break;
               }
            }
         }
         
         // Only process as entry if position exists (it's a new position)
         // DEAL_TYPE_BUY or DEAL_TYPE_SELL for entry deals
         if((deal_type == DEAL_TYPE_BUY || deal_type == DEAL_TYPE_SELL) && position_exists) {
            if(InpEnableLogging) {
               Print("Entry deal detected - Deal: ", deal_ticket, ", Position ID: ", position_id);
            }
            ProcessPositionOpen(deal_ticket);
         } else if(InpEnableLogging && (deal_type == DEAL_TYPE_BUY || deal_type == DEAL_TYPE_SELL)) {
            Print("Skipping deal (position doesn't exist, likely closing): Deal ", deal_ticket, ", Position ID: ", position_id);
         }
      }
   }
   
   // Handle position closing
   // Check if position was removed (closed)
   if(trans.type == TRADE_TRANSACTION_POSITION) {
      ulong position_id = trans.position;
      ulong deal_id = trans.deal;
      
      if(InpEnableLogging) {
         Print("TRADE_TRANSACTION_POSITION event - Position ID: ", position_id, ", Deal: ", deal_id);
      }
      
      // Check if position still exists
      bool position_exists = false;
      int total = PositionsTotal();
      for(int i = 0; i < total; i++) {
         if(position.SelectByIndex(i)) {
            if(position.Identifier() == (long)position_id) {
               position_exists = true;
               if(InpEnableLogging) {
                  Print("Position still exists, not closed yet");
               }
               break;
            }
         }
      }
      
      // If position doesn't exist, it was closed
      if(!position_exists && position_id > 0) {
         if(InpEnableLogging) {
            Print("Position closed detected! Position ID: ", position_id, ", Deal: ", deal_id);
         }
         
         // Try to process with the deal from transaction first
         bool processed = false;
         if(deal_id > 0 && HistoryDealSelect(deal_id)) {
            if(InpEnableLogging) {
               Print("Processing close with deal from transaction: ", deal_id);
            }
            ProcessPositionClose(deal_id);
            processed = true;
         }
         
         // If that didn't work, search for closing deals
         if(!processed) {
            if(InpEnableLogging) {
               Print("Deal from transaction not found, searching in history...");
            }
            if(HistorySelect(0, TimeCurrent())) {
               int deals_total = HistoryDealsTotal();
               if(InpEnableLogging) {
                  Print("Searching through ", deals_total, " deals for position ", position_id);
               }
               
               // Look for the most recent closing deal for this position
               for(int i = deals_total - 1; i >= 0; i--) {
                  ulong deal_ticket = HistoryDealGetTicket(i);
                  if(deal_ticket > 0) {
                     ulong deal_pos_id = HistoryDealGetInteger(deal_ticket, DEAL_POSITION_ID);
                     if(deal_pos_id == position_id) {
                        long deal_type = HistoryDealGetInteger(deal_ticket, DEAL_TYPE);
                        if(InpEnableLogging) {
                           Print("Found deal ", deal_ticket, " for position ", position_id, ", type: ", deal_type);
                        }
                        // Process any deal related to this position (entry or closing)
                        ProcessPositionClose(deal_ticket);
                        processed = true;
                        break;
                     }
                  }
               }
            }
         }
         
         if(!processed && InpEnableLogging) {
            Print("WARNING: Could not find closing deal for position ", position_id);
         }
      }
   }
   
   // Also check for DEAL_ADD events that might be closing deals
   // This is important because sometimes TRADE_TRANSACTION_POSITION doesn't fire correctly
   if(trans.type == TRADE_TRANSACTION_DEAL_ADD) {
      ulong deal_ticket = trans.deal;
      
      if(HistoryDealSelect(deal_ticket)) {
         long deal_type = HistoryDealGetInteger(deal_ticket, DEAL_TYPE);
         ulong position_id = HistoryDealGetInteger(deal_ticket, DEAL_POSITION_ID);
         
         if(InpEnableLogging) {
            Print("DEAL_ADD event - Deal: ", deal_ticket, ", Position ID: ", position_id, ", Type: ", deal_type);
         }
         
         // Check if this is a closing deal (position no longer exists)
         bool position_exists = false;
         int total = PositionsTotal();
         for(int i = 0; i < total; i++) {
            if(position.SelectByIndex(i)) {
               if(position.Identifier() == (long)position_id) {
                  position_exists = true;
                  break;
               }
            }
         }
         
         // If position doesn't exist and this deal is related to a position, it's a closing deal
         if(!position_exists && position_id > 0) {
            if(InpEnableLogging) {
               Print("Closing deal detected in DEAL_ADD - Deal: ", deal_ticket, ", Position ID: ", position_id, ", Type: ", deal_type);
            }
            // Process the close - use a small delay to ensure all deals are in history
            Sleep(100);
            ProcessPositionClose(deal_ticket);
         }
      }
   }
}

//+------------------------------------------------------------------+
//| Process existing open positions on EA start                      |
//+------------------------------------------------------------------+
void ProcessExistingPositions()
{
   int total = PositionsTotal();
   
   for(int i = 0; i < total; i++) {
      if(position.SelectByIndex(i)) {
         ProcessPositionOpenFromPosition(position.Ticket());
      }
   }
}

//+------------------------------------------------------------------+
//| Process position opening from deal                               |
//+------------------------------------------------------------------+
void ProcessPositionOpen(ulong deal_ticket)
{
   if(!HistoryDealSelect(deal_ticket)) {
      Print("ERROR: Failed to select deal ", deal_ticket);
      return;
   }
   
   string symbol = HistoryDealGetString(deal_ticket, DEAL_SYMBOL);
   ulong position_id = HistoryDealGetInteger(deal_ticket, DEAL_POSITION_ID);
   
   // Find the position by position_id
   // Try to find position by iterating through all positions
   bool found = false;
   int total = PositionsTotal();
   for(int i = total - 1; i >= 0; i--) {
      ulong pos_ticket = PositionGetTicket(i);
      if(pos_ticket > 0) {
         if(PositionSelectByTicket(pos_ticket)) {
            if(PositionGetInteger(POSITION_IDENTIFIER) == position_id) {
               found = true;
               ProcessPositionOpenFromPosition(pos_ticket);
               break;
            }
         }
      }
   }
   
   // If position not found, it might be:
   // 1. Part of a closing operation (position already closed)
   // 2. A deal that was processed before the position was fully opened
   // 3. An actual error
   // Only log as debug, not warning, since this is often normal during position closing
   if(!found) {
      if(InpEnableLogging) {
         Print("INFO: Position ", position_id, " not found after deal ", deal_ticket, " (may be part of closing operation)");
      }
   }
}

//+------------------------------------------------------------------+
//| Process position opening from position ticket                    |
//+------------------------------------------------------------------+
void ProcessPositionOpenFromPosition(ulong position_ticket)
{
   if(!position.SelectByTicket(position_ticket)) {
      Print("ERROR: Failed to select position ", position_ticket);
      return;
   }
   
   TradeData trade_data;
   
   // Extract position data
   trade_data.ticket = IntegerToString(position_ticket);
   trade_data.trade_uid = GenerateTradeUID(position_ticket);
   trade_data.symbol = position.Symbol();
   trade_data.side = (position.PositionType() == POSITION_TYPE_BUY) ? "buy" : "sell";
   trade_data.volume = position.Volume();
   trade_data.price_open = position.PriceOpen();
   trade_data.stop_loss = position.StopLoss();
   trade_data.take_profit = position.TakeProfit();
   trade_data.time_open = (datetime)position.Time();
   trade_data.price_close = 0.0;
   trade_data.time_close = 0;
   trade_data.profit = 0.0;
   trade_data.commission = 0.0;
   trade_data.swap = 0.0;
   trade_data.account_mode = GetAccountMode();
   trade_data.broker = GetBrokerName();
   
   // Send to backend
   SendTradeOpen(trade_data);
}

//+------------------------------------------------------------------+
//| Process position closing                                         |
//+------------------------------------------------------------------+
void ProcessPositionClose(ulong deal_ticket)
{
   if(!HistoryDealSelect(deal_ticket)) {
      Print("ERROR: Failed to select deal ", deal_ticket);
      return;
   }
   
   string symbol = HistoryDealGetString(deal_ticket, DEAL_SYMBOL);
   ulong position_id = HistoryDealGetInteger(deal_ticket, DEAL_POSITION_ID);
   
   // Find position in history to get all closing deals
   if(!HistorySelect(0, TimeCurrent())) {
      Print("ERROR: Failed to select history");
      return;
   }
   
   // Get all deals for this position
   double total_profit = 0.0;
   double total_commission = 0.0;
   double total_swap = 0.0;
   datetime close_time = 0;
   double close_price = 0.0;
   string ticket_str = "";
   ulong position_ticket = 0;
   
   int deals_total = HistoryDealsTotal();
   for(int i = 0; i < deals_total; i++) {
      ulong ticket = HistoryDealGetTicket(i);
      if(ticket > 0) {
         if(HistoryDealGetInteger(ticket, DEAL_POSITION_ID) == position_id) {
            long deal_type = HistoryDealGetInteger(ticket, DEAL_TYPE);
            string deal_symbol = HistoryDealGetString(ticket, DEAL_SYMBOL);
            
            if(deal_symbol == symbol) {
               // Try to get position ticket from deal
               // Note: In MT5, we need to search for the position by position_id
               // The ticket is the same as the position identifier in many cases
               if(position_ticket == 0) {
                  // First, try to find in open positions
                  int pos_total = PositionsTotal();
                  for(int j = 0; j < pos_total; j++) {
                     if(position.SelectByIndex(j)) {
                        if(position.Identifier() == (long)position_id) {
                           position_ticket = position.Ticket();
                           ticket_str = IntegerToString(position_ticket);
                           break;
                        }
                     }
                  }
               }
               
               // Get position ticket from entry deal (first BUY or SELL)
               if(position_ticket == 0 && (deal_type == DEAL_TYPE_BUY || deal_type == DEAL_TYPE_SELL)) {
                  // Get the position ticket from the entry deal
                  // In MT5, we can get it from the position history
                  // For now, we'll use position_id as fallback
               }
               
               // Accumulate profit, commission, swap from all deals
               double deal_profit = HistoryDealGetDouble(ticket, DEAL_PROFIT);
               double deal_commission = HistoryDealGetDouble(ticket, DEAL_COMMISSION);
               double deal_swap = HistoryDealGetDouble(ticket, DEAL_SWAP);
               
               total_profit += deal_profit;
               total_commission += deal_commission;
               total_swap += deal_swap;
               
               // Get close price from the closing deal (opposite of entry)
               // For BUY entry, closing is SELL. For SELL entry, closing is BUY.
               datetime deal_time = (datetime)HistoryDealGetInteger(ticket, DEAL_TIME);
               double deal_price = HistoryDealGetDouble(ticket, DEAL_PRICE);
               
               // The closing deal is the opposite type of the entry
               // We want the latest deal that closes the position
               if(deal_time > close_time) {
                  close_time = deal_time;
                  // Use price from closing deal (not BALANCE deals)
                  if(deal_type == DEAL_TYPE_BUY || deal_type == DEAL_TYPE_SELL) {
                     close_price = deal_price;
                  }
               }
               
               // Also check BALANCE deals for final price if no close price found
               if(deal_type == DEAL_TYPE_BALANCE && close_price == 0.0) {
                  close_price = deal_price;
               }
            }
         }
      }
   }
   
   // If still not found, use position_id as ticket (fallback)
   // In MT5, when a position is closed, we can use the position_id as the ticket
   // since the position_id is unique and the backend can find trades by ticket
   if(StringLen(ticket_str) == 0 || position_ticket == 0) {
      // Use position_id as ticket (this is a valid approach in MT5)
      position_ticket = position_id;
      ticket_str = IntegerToString(position_id);
      if(InpEnableLogging) {
         Print("Using position_id as ticket (position already closed): ", ticket_str);
      }
   }
   
   if(StringLen(ticket_str) == 0 || position_ticket == 0) {
      Print("ERROR: Could not find position ticket for deal ", deal_ticket, ", position_id: ", position_id);
      return;
   }
   
   // Validate we have required data
   if(close_time == 0) {
      Print("ERROR: Could not determine close time for position ", position_id);
      return;
   }
   
   if(close_price == 0.0) {
      Print("WARNING: Close price is 0.0 for position ", position_id, ". Trying to get from last deal...");
      // Try to get price from the last deal of this position
      // Search through all deals we already have
      for(int i = deals_total - 1; i >= 0; i--) {
         ulong ticket = HistoryDealGetTicket(i);
         if(ticket > 0) {
            if(HistoryDealGetInteger(ticket, DEAL_POSITION_ID) == position_id) {
               double deal_price = HistoryDealGetDouble(ticket, DEAL_PRICE);
               if(deal_price > 0.0) {
                  close_price = deal_price;
                  if(InpEnableLogging) {
                     Print("Got close price from deal ", ticket, ": ", close_price);
                  }
                  break;
               }
            }
         }
      }
      
      if(close_price == 0.0) {
         Print("ERROR: Could not determine close price for position ", position_id);
         return;
      }
   }
   
   // Build close data
   // Note: We don't generate a new trade_uid - the backend will find the trade by ticket
   TradeData close_data;
   close_data.ticket = ticket_str;
   close_data.trade_uid = ""; // Empty - backend will find by ticket
   close_data.price_close = close_price;
   close_data.time_close = close_time;
   close_data.profit = total_profit;
   close_data.commission = total_commission;
   close_data.swap = total_swap;
   
   if(InpEnableLogging) {
      Print("Closing trade - Ticket: ", ticket_str, ", Price: ", close_price, ", Profit: ", total_profit, ", Time: ", TimeToString(close_time));
      Print("Close data - ticket: ", close_data.ticket, ", trade_uid: ", close_data.trade_uid, ", price_close: ", close_data.price_close, ", time_close: ", close_data.time_close);
   }
   
   // Validate close data before sending
   if(close_price == 0.0) {
      Print("ERROR: Cannot close trade with price 0.0");
      return;
   }
   
   if(close_time == 0) {
      Print("ERROR: Cannot close trade with time 0");
      return;
   }
   
   // Send to backend
   SendTradeClose(close_data);
}

//+------------------------------------------------------------------+
//| Generate unique trade UID                                        |
//+------------------------------------------------------------------+
string GenerateTradeUID(ulong ticket)
{
   // Generate UID: MT5_{Account}_{Ticket}_{Timestamp}
   long account_login = account.Login();
   long timestamp = (long)TimeCurrent();
   string uid = StringFormat("MT5_%lld_%llu_%lld", account_login, ticket, timestamp);
   
   // Ensure it's not empty
   if(StringLen(uid) == 0) {
      uid = "MT5_" + IntegerToString(ticket) + "_" + IntegerToString((long)TimeCurrent());
   }
   
   return uid;
}

//+------------------------------------------------------------------+
//| Get account mode (demo/live)                                     |
//+------------------------------------------------------------------+
string GetAccountMode()
{
   // Check if account is demo
   if(account.TradeMode() == ACCOUNT_TRADE_MODE_DEMO) {
      return "demo";
   }
   
   // For real accounts, check server name or other indicators
   // This is a heuristic - adjust based on your broker
   string server = account.Server();
   string name = account.Name();
   
   // Common demo server patterns
   if(StringFind(server, "Demo") >= 0 || 
      StringFind(server, "demo") >= 0 ||
      StringFind(name, "Demo") >= 0 ||
      StringFind(name, "demo") >= 0) {
      return "demo";
   }
   
   return "live";
}

//+------------------------------------------------------------------+
//| Get broker name                                                  |
//+------------------------------------------------------------------+
string GetBrokerName()
{
   return account.Company();
}

//+------------------------------------------------------------------+
//| Send trade open to backend                                       |
//+------------------------------------------------------------------+
void SendTradeOpen(TradeData &data)
{
   string json = BuildOpenJSON(data);
   
   if(InpEnableLogging) {
      Print("Sending trade open: ", json);
   }
   
   string url = g_serverURL + "/trades/open";
   // Build headers - Supabase REQUIRES Authorization header
   string headers = "Content-Type: application/json\r\n";
   headers += "X-API-Key: " + g_apiKey + "\r\n";
   headers += "Authorization: Bearer " + g_supabaseAnonKey + "\r\n";
   headers += "apikey: " + g_supabaseAnonKey + "\r\n";
   
   char post[];
   char result[];
   string result_headers;
   
   StringToCharArray(json, post, 0, WHOLE_ARRAY);
   
   int attempts = 0;
   int res = -1;
   
   while(attempts < g_retryCount) {
      ResetLastError();
      res = WebRequest("POST", url, headers, g_timeout, post, result, result_headers);
      
      if(res == 200) {
         if(InpEnableLogging) {
            Print("Trade open sent successfully. Ticket: ", data.ticket);
         }
         return;
      }
      
      attempts++;
      if(attempts < g_retryCount) {
         Print("Retry ", attempts, " of ", g_retryCount, " for trade open. Ticket: ", data.ticket);
         Sleep(1000 * attempts); // Exponential backoff
      }
   }
   
   Print("ERROR: Failed to send trade open after ", g_retryCount, " attempts. Ticket: ", data.ticket, ". HTTP Code: ", res);
   Print("Last error: ", GetLastError());
}

//+------------------------------------------------------------------+
//| Send trade close to backend                                      |
//+------------------------------------------------------------------+
void SendTradeClose(TradeData &data)
{
   string json = BuildCloseJSON(data);
   
   if(InpEnableLogging) {
      Print("Sending trade close: ", json);
      Print("Close URL: ", g_serverURL + "/trades/close");
   }
   
   string url = g_serverURL + "/trades/close";
   // Build headers - Supabase REQUIRES Authorization header
   string headers = "Content-Type: application/json\r\n";
   headers += "X-API-Key: " + g_apiKey + "\r\n";
   headers += "Authorization: Bearer " + g_supabaseAnonKey + "\r\n";
   headers += "apikey: " + g_supabaseAnonKey + "\r\n";
   
   char post[];
   char result[];
   string result_headers;
   
   StringToCharArray(json, post, 0, WHOLE_ARRAY);
   
   int attempts = 0;
   int res = -1;
   
   while(attempts < g_retryCount) {
      ResetLastError();
      res = WebRequest("POST", url, headers, g_timeout, post, result, result_headers);
      
      if(InpEnableLogging) {
         Print("Trade close response - HTTP Code: ", res, ", Ticket: ", data.ticket);
         if(StringLen(result_headers) > 0) {
            Print("Response headers: ", result_headers);
         }
         if(ArraySize(result) > 0) {
            string result_str = CharArrayToString(result);
            Print("Response body: ", result_str);
         }
      }
      
      if(res == 200) {
         if(InpEnableLogging) {
            Print("Trade close sent successfully. Ticket: ", data.ticket);
         }
         return;
      }
      
      attempts++;
      if(attempts < g_retryCount) {
         Print("Retry ", attempts, " of ", g_retryCount, " for trade close. Ticket: ", data.ticket, ". HTTP Code: ", res);
         Sleep(1000 * attempts);
      }
   }
   
   Print("ERROR: Failed to send trade close after ", g_retryCount, " attempts. Ticket: ", data.ticket, ". HTTP Code: ", res);
   Print("Last error: ", GetLastError());
   if(ArraySize(result) > 0) {
      string error_result = CharArrayToString(result);
      Print("Error response: ", error_result);
   }
}

//+------------------------------------------------------------------+
//| Build JSON for trade open                                        |
//+------------------------------------------------------------------+
string BuildOpenJSON(TradeData &data)
{
   string json = "{";
   json += "\"ticket\":\"" + data.ticket + "\",";
   json += "\"trade_uid\":\"" + data.trade_uid + "\",";
   json += "\"symbol\":\"" + data.symbol + "\",";
   json += "\"side\":\"" + data.side + "\",";
   json += "\"volume\":" + DoubleToString(data.volume, 8) + ",";
   json += "\"price_open\":" + DoubleToString(data.price_open, DigitsFromSymbol(data.symbol)) + ",";
   json += "\"stop_loss\":" + DoubleToString(data.stop_loss, DigitsFromSymbol(data.symbol)) + ",";
   json += "\"take_profit\":" + DoubleToString(data.take_profit, DigitsFromSymbol(data.symbol)) + ",";
   json += "\"time_open\":" + IntegerToString((long)data.time_open) + ",";
   json += "\"account_mode\":\"" + data.account_mode + "\",";
   json += "\"broker\":\"" + data.broker + "\"";
   json += "}";
   
   return json;
}

//+------------------------------------------------------------------+
//| Build JSON for trade close                                       |
//+------------------------------------------------------------------+
string BuildCloseJSON(TradeData &data)
{
   string json = "{";
   json += "\"ticket\":\"" + data.ticket + "\",";
   json += "\"trade_uid\":\"" + data.trade_uid + "\",";
   json += "\"price_close\":" + DoubleToString(data.price_close, 5) + ",";
   json += "\"time_close\":" + IntegerToString((long)data.time_close) + ",";
   json += "\"profit\":" + DoubleToString(data.profit, 2) + ",";
   json += "\"commission\":" + DoubleToString(data.commission, 2) + ",";
   json += "\"swap\":" + DoubleToString(data.swap, 2);
   json += "}";
   
   return json;
}

//+------------------------------------------------------------------+
//| Get digits for symbol                                            |
//+------------------------------------------------------------------+
int DigitsFromSymbol(string symbol)
{
   int digits = (int)SymbolInfoInteger(symbol, SYMBOL_DIGITS);
   return digits > 0 ? digits : 5;
}

//+------------------------------------------------------------------+
//| Update P&L for an open position                                   |
//+------------------------------------------------------------------+
void UpdatePositionPnL(ulong position_ticket)
{
   if(!position.SelectByTicket(position_ticket)) {
      if(InpEnableLogging) {
         Print("WARNING: Failed to select position ", position_ticket);
      }
      return;
   }
   
   string ticket_str = IntegerToString(position_ticket);
   string symbol = position.Symbol();
   double current_price = position.PriceCurrent();
   double swap = position.Swap();
   double profit = position.Profit();
   double unrealized_pnl = profit; // In MT5, Profit() returns unrealized P&L for open positions
   
   // Get trade_uid if available (we'll use ticket as fallback)
   string trade_uid = "";
   
   // Build JSON for P&L update
   string json = "{";
   json += "\"ticket\":\"" + ticket_str + "\",";
   if(StringLen(trade_uid) > 0) {
      json += "\"trade_uid\":\"" + trade_uid + "\",";
   }
   json += "\"current_price\":" + DoubleToString(current_price, DigitsFromSymbol(symbol)) + ",";
   json += "\"unrealized_pnl\":" + DoubleToString(unrealized_pnl, 2) + ",";
   json += "\"current_profit\":" + DoubleToString(profit, 2);
   if(swap != 0.0) {
      json += ",\"swap\":" + DoubleToString(swap, 2);
   }
   json += "}";
   
   // Send update to backend
   string url = g_serverURL + "/trades/update-pnl";
   char data[];
   char result[];
   string headers;
   
   StringToCharArray(json, data, 0, StringLen(json));
   
   // Build headers
   headers = "Content-Type: application/json\r\n";
   headers += "x-api-key: " + g_apiKey + "\r\n";
   if(StringLen(g_supabaseAnonKey) > 0) {
      headers += "apikey: " + g_supabaseAnonKey + "\r\n";
      headers += "Authorization: Bearer " + g_supabaseAnonKey + "\r\n";
   }
   
   int res = WebRequest("POST", url, headers, g_timeout, data, result, headers);
   
   if(res == 200 || res == 201) {
      if(InpEnableLogging) {
         string response = CharArrayToString(result);
         Print("P&L updated successfully for ticket ", ticket_str, ". Response: ", response);
      }
   } else {
      if(InpEnableLogging) {
         Print("WARNING: Failed to update P&L for ticket ", ticket_str, ". HTTP Code: ", res);
      }
   }
}

//+------------------------------------------------------------------+

