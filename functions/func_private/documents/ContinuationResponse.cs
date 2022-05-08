using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;

namespace func_private.documents
{
    public record ContinuationResponse
    {
        public string version;
        public string action;
        public string userMessage;
        public string status;
    }
}
