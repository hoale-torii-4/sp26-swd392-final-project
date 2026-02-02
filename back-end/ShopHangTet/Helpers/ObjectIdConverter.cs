using System.Text.Json;
using System.Text.Json.Serialization;
using MongoDB.Bson;

namespace ShopHangTet.Helpers
{
    public class ObjectIdConverter : JsonConverter<ObjectId>
    {
        // Frontend -> String -> ObjectId
        public override ObjectId Read(ref Utf8JsonReader reader, Type typeToConvert, JsonSerializerOptions options)
        {
            var value = reader.GetString();
            return ObjectId.TryParse(value, out var objectId) ? objectId : ObjectId.Empty;
        }

        // -> Backend -> ObjectId -> String
        public override void Write(Utf8JsonWriter writer, ObjectId value, JsonSerializerOptions options)
        {
            writer.WriteStringValue(value.ToString());
        }
    }
}