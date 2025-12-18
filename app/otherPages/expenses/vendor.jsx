import { View, Text } from 'react-native'
import React, { useState } from 'react'
import { ThemedView, ThemedText, SafeAreacontext } from '../../../src/components/ThemedColor'
import PageHeader from '../../../src/components/PageHeader'
import Button from '../../../src/components/Button'
import Input from '../../../src/components/Input'

const Vendor = () => {
    const [vendor, setVendor] = useState("")
    return (
        <SafeAreacontext className="flex-1">
            <PageHeader routes={"Vendor Tracking"} />
            <View className="p-4 flex-1 ">
                <ThemedView className="p-4 rounded-lg" style={{ elevation: 2 }}>
                    <ThemedText color={"#374151"} className="text-center text-lg font-medium ">
                        Add Vendor
                    </ThemedText>
                </ThemedView>

                <ThemedView className="px-6 py-5 mt-5 rounded-lg" style={{ elevation: 2 }}>
                    <ThemedText className="mb-1">vendor:</ThemedText>
                    <Input
                        placeholder="Type your vendor here .."
                        value={vendor}
                        onchange={(val) => setVendor(val)}
                    />
                </ThemedView>

                <Button className="mt-5" title="submit" />

            </View>
        </SafeAreacontext>
    )
}

export default Vendor