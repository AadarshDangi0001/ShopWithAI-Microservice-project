import userModel from "../models/user.model.js";

async function getUserAddresses(req, res) {
    try {
        const user = await userModel.findById(req.user._id).select('addresses');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        return res.status(200).json({
            message: 'Addresses fetched successfully',
            addresses: user.addresses
        });
    } catch (error) {
        console.error('Error fetching user addresses:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

async function addUserAddress(req, res) {
    const { street, city, state, zipCode, country } = req.body;

    if (!street || !city || !state || !zipCode || !country) {
        return res.status(400).json({ error: 'Invalid address payload' });
    }

    try {
        const user = await userModel
            .findByIdAndUpdate(
                req.user._id,
                {
                    $push: {
                        addresses: { street, city, state, zipCode, country }
                    }
                },
                { new: true }
            )
            .select('addresses');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        return res.status(201).json({
            message: 'Address added successfully',
            addresses: user.addresses
        });
    } catch (error) {
        console.error('Error adding user address:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

async function deleteUserAddress(req, res) {
    try {
        const user = await userModel.findById(req.user._id).select('addresses');

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const addressId = req.params.addressId;
        const addressDoc = user.addresses.id(addressId);

        if (!addressDoc) {
            return res.status(404).json({ error: 'Address not found' });
        }

        addressDoc.deleteOne();
        await user.save();

        return res.status(200).json({
            message: 'Address deleted successfully',
            addresses: user.addresses
        });
    } catch (error) {
        console.error('Error deleting user address:', error);
        return res.status(500).json({ error: 'Internal server error' });
    }
}

export { getUserAddresses, addUserAddress, deleteUserAddress };




