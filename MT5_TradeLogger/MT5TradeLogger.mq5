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
input string   InpAPIKey    = "your-api-key-here";           // API Key for authentication
input int      InpTimeout   = 5000;                          // Request timeout (ms)
input int      InpRetryCount = 3;                            // Retry attempts on failure
input bool     InpEnableLogging = true;                      // Enable debug logging

//--- Global variables
string         g_serverURL;
string         g_apiKey;
int            g_timeout;
int            g_retryCount;
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
      Print("ERROR: API Key is required");
      return INIT_PARAMETERS_INCORRECT;
   }
   
   // Initialize global variables
   g_serverURL = InpServerURL;
   g_apiKey = InpAPIKey;
   g_timeout = InpTimeout;
   g_retryCount = InpRetryCount;
   
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
   
   return INIT_SUCCEEDED;
}

//+------------------------------------------------------------------+
//| Expert deinitialization function                                 |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
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
//| Trade transaction event handler                                  |
//+------------------------------------------------------------------+
void OnTradeTransaction(const MqlTradeTransaction& trans,
                        const MqlTradeRequest& request,
                        const MqlTradeResult& result)
{
   // Handle position opening
   if(trans.type == TRADE_TRANSACTION_DEAL_ADD) {
      ulong deal_ticket = trans.deal;
      
      if(HistoryDealSelect(deal_ticket)) {
         long deal_type = HistoryDealGetInteger(deal_ticket, DEAL_TYPE);
         
         // DEAL_TYPE_BUY or DEAL_TYPE_SELL for entry deals
         if(deal_type == DEAL_TYPE_BUY || deal_type == DEAL_TYPE_SELL) {
            ProcessPositionOpen(deal_ticket);
         }
      }
   }
   
   // Handle position closing
   if(trans.type == TRADE_TRANSACTION_POSITION) {
      if(HistoryDealSelect(trans.deal)) {
         long deal_type = HistoryDealGetInteger(trans.deal, DEAL_TYPE);
         
         // DEAL_TYPE_BALANCE or closing deals indicate position closed
         if(deal_type == DEAL_TYPE_BALANCE) {
            ProcessPositionClose(trans.deal);
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
   if(!position.SelectByIndex(PositionGetIndexByID((long)position_id))) {
      Print("WARNING: Position ", position_id, " not found after deal ", deal_ticket);
      return;
   }
   
   ProcessPositionOpenFromPosition(position.Ticket());
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
   trade_data.take_profit = position.Tp();
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
   
   int deals_total = HistoryDealsTotal();
   for(int i = 0; i < deals_total; i++) {
      ulong ticket = HistoryDealGetTicket(i);
      if(ticket > 0) {
         if(HistoryDealGetInteger(ticket, DEAL_POSITION_ID) == position_id) {
            long deal_type = HistoryDealGetInteger(ticket, DEAL_TYPE);
            string deal_symbol = HistoryDealGetString(ticket, DEAL_SYMBOL);
            
            if(deal_symbol == symbol) {
               // Accumulate profit, commission, swap
               if(deal_type == DEAL_TYPE_BALANCE) {
                  double deal_profit = HistoryDealGetDouble(ticket, DEAL_PROFIT);
                  double deal_commission = HistoryDealGetDouble(ticket, DEAL_COMMISSION);
                  double deal_swap = HistoryDealGetDouble(ticket, DEAL_SWAP);
                  
                  total_profit += deal_profit;
                  total_commission += deal_commission;
                  total_swap += deal_swap;
                  
                  datetime deal_time = (datetime)HistoryDealGetInteger(ticket, DEAL_TIME);
                  if(deal_time > close_time) {
                     close_time = deal_time;
                     close_price = HistoryDealGetDouble(ticket, DEAL_PRICE);
                  }
               }
               
               // Get position ticket from first deal
               if(StringLen(ticket_str) == 0) {
                  ulong pos_id = HistoryDealGetInteger(ticket, DEAL_POSITION_ID);
                  // Find position ticket by position_id
                  int pos_total = PositionsTotal();
                  for(int j = 0; j < pos_total; j++) {
                     if(position.SelectByIndex(j)) {
                        if(position.Identifier() == (long)pos_id) {
                           ticket_str = IntegerToString(position.Ticket());
                           break;
                        }
                     }
                  }
                  // If not found in open positions, search in history
                  if(StringLen(ticket_str) == 0) {
                     ticket_str = IntegerToString(pos_id);
                  }
               }
            }
         }
      }
   }
   
   if(StringLen(ticket_str) == 0) {
      Print("ERROR: Could not find position ticket for deal ", deal_ticket);
      return;
   }
   
   // Build close data
   TradeData close_data;
   close_data.ticket = ticket_str;
   close_data.trade_uid = GenerateTradeUID(StringToInteger(ticket_str));
   close_data.price_close = close_price;
   close_data.time_close = close_time;
   close_data.profit = total_profit;
   close_data.commission = total_commission;
   close_data.swap = total_swap;
   
   // Send to backend
   SendTradeClose(close_data);
}

//+------------------------------------------------------------------+
//| Generate unique trade UID                                        |
//+------------------------------------------------------------------+
string GenerateTradeUID(ulong ticket)
{
   // Generate UID: MT5_{Account}_{Ticket}_{Timestamp}
   long account = account.Login();
   long timestamp = TimeCurrent();
   return StringFormat("MT5_%lld_%llu_%lld", account, ticket, timestamp);
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
   string headers = "Content-Type: application/json\r\n";
   headers += "X-API-Key: " + g_apiKey + "\r\n";
   
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
   }
   
   string url = g_serverURL + "/trades/close";
   string headers = "Content-Type: application/json\r\n";
   headers += "X-API-Key: " + g_apiKey + "\r\n";
   
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
            Print("Trade close sent successfully. Ticket: ", data.ticket);
         }
         return;
      }
      
      attempts++;
      if(attempts < g_retryCount) {
         Print("Retry ", attempts, " of ", g_retryCount, " for trade close. Ticket: ", data.ticket);
         Sleep(1000 * attempts);
      }
   }
   
   Print("ERROR: Failed to send trade close after ", g_retryCount, " attempts. Ticket: ", data.ticket, ". HTTP Code: ", res);
   Print("Last error: ", GetLastError());
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

